from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import uuid

from services import wealth_score, tax_optimizer, portfolio_advisor, fraud_sentinel, avatar_engine
from models import schemas
from database import database

app = FastAPI(
    title="Avatar Base API",
    description="Backend API for AI-Powered Digital Wealth Management System",
    version="1.0.0"
)

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "Avatar Base API is running",
        "compliance": ["DPDP Act 2023", "SEBI", "RBI Data-Localized"],
        "database": "SQLite Local Server Connected"
    }

@app.get("/api/profile/{user_id}")
def get_user_profile(user_id: str):
    """Fetches user details, holdings, recent transactions, tax info, and consent records."""
    data = database.get_user_financials(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="User not found")
    return data

@app.post("/api/whs/calculate")
def calculate_whs(req: schemas.WealthHealthScoreRequest):
    # Retrieve user segment
    profile = database.get_user_profile(req.user_id)
    segment = profile["lifecycle_segment"] if profile else "YOUNG_EMPLOYED"
    
    score, message, pillars, explanations = wealth_score.compute_score(
        income=req.income,
        savings=req.savings,
        investments=req.investments,
        debt=req.debt,
        current_savings_balance=req.current_savings_balance,
        has_life_insurance=req.has_life_insurance,
        life_cover=req.life_cover,
        has_health_insurance=req.has_health_insurance,
        health_cover=req.health_cover,
        family_size=req.family_size,
        active_sip_monthly=req.active_sip_monthly,
        sip_missed_last_6m=req.sip_missed_last_6m,
        portfolio_drift_pct=req.portfolio_drift_pct,
        emi_monthly=req.emi_monthly,
        credit_card_utilization_pct=req.credit_card_utilization_pct,
        segment=segment
    )
    
    # Update score in database
    conn = database.get_db_connection()
    conn.execute(
        "UPDATE users SET wealth_health_score = ?, whs_last_computed = ? WHERE user_id = ?",
        (score, datetime.now().isoformat(), req.user_id)
    )
    conn.commit()
    conn.close()

    # Generate Advice Card and Write to SEBI Audit Log
    card = avatar_engine.generate_micro_copy_card(
        "WHS_IMPROVEMENT", segment, 
        {"score": score, "grade": "A" if score > 80 else "B" if score > 60 else "C", "top_action": message}
    )
    database.log_audit_trail(
        card["cardId"], req.user_id, "WHS_IMPROVEMENT", card, 
        {"income": req.income, "savings": req.savings, "debt": req.debt}, 
        0.90, "WHS-COMP-Approved", segment
    )
    
    return {
        "score": score,
        "message": message,
        "pillars": pillars,
        "explanations": explanations,
        "card": card
    }

@app.post("/api/tax/optimize")
def optimize_tax(req: schemas.TaxOptimizationRequest):
    # Retrieve user segment
    profile = database.get_user_profile(req.user_id)
    segment = profile["lifecycle_segment"] if profile else "YOUNG_EMPLOYED"
    is_senior = segment.upper() == "SENIOR"
    
    comparison = tax_optimizer.calculate_tax_old_vs_new(
        gross_income=req.income,
        is_senior=is_senior,
        sec_80c=req.investments_80c,
        sec_80d=req.health_insurance_80d,
        nps_80ccd1b=req.nps_80ccd1b,
        hra_eligible=req.hra_eligible,
        home_loan_interest=req.home_loan_interest,
        sec_80ttb=req.sec_80ttb,
        other_deductions=req.other_deductions
    )
    
    recs = tax_optimizer.get_80c_recommendations(req.investments_80c, 10)
    
    # Store or update tax profile in DB
    conn = database.get_db_connection()
    conn.execute(
        """INSERT OR REPLACE INTO tax_profiles (
            tax_profile_id, user_id, fiscal_year, selected_regime, gross_income_paise,
            elss_invested_paise, sec_80c_remaining_paise, estimated_total_tax_old_paise, estimated_total_tax_new_paise,
            recommended_regime, regime_savings_paise, last_computed_at
        ) VALUES ((SELECT tax_profile_id FROM tax_profiles WHERE user_id=? AND fiscal_year='2025-26'), ?, '2025-26', ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            req.user_id, req.user_id, comparison["recommended"], int(req.income * 100),
            int(req.investments_80c * 100), int(recs["remaining"] * 100), int(comparison["old_regime"]["tax"] * 100),
            int(comparison["new_regime"]["tax"] * 100), comparison["recommended"], int(comparison["tax_saved"] * 100),
            datetime.now().isoformat()
        )
    )
    conn.commit()
    conn.close()

    # Log recommendations to audit ledger
    if recs["remaining"] > 0:
        card = avatar_engine.generate_micro_copy_card(
            "TAX_80C", segment,
            {"remaining": int(recs["remaining"]), "instrument": "ELSS Mutual Fund"}
        )
        database.log_audit_trail(
            card["cardId"], req.user_id, "TAX_80C", card,
            {"invested_80c": req.investments_80c, "remaining_80c": recs["remaining"]},
            0.92, "TAX-80C-SEBI-Approved", segment
        )
        
    return {
        "comparison": comparison,
        "recommendations": recs
    }

@app.post("/api/portfolio/drift")
def check_drift(req: schemas.PortfolioDriftRequest):
    # Retrieve user segment
    profile = database.get_user_profile(req.user_id)
    segment = profile["lifecycle_segment"] if profile else "YOUNG_EMPLOYED"

    alerts = portfolio_advisor.detect_drift(req.current_allocation, req.target_allocation)
    
    # Calculate total portfolio value for concentration checking
    total_val = sum(h.get("current_value_paise", 0.0) for h in req.holdings) / 100.0
    concentration_alerts = portfolio_advisor.detect_concentration_risks(req.holdings, total_val)
    
    # Generate drift card if significant drift is found
    drift_card = None
    if alerts:
        top_alert = alerts[0]
        drift_card = avatar_engine.generate_micro_copy_card(
            "PORTFOLIO_DRIFT", segment,
            {
                "asset_class": top_alert["asset_class"],
                "drift": top_alert["drift_pct"],
                "direction": top_alert["direction"],
                "current": top_alert["current_pct"],
                "target": top_alert["target_pct"]
            }
        )
        database.log_audit_trail(
            drift_card["cardId"], req.user_id, "PORTFOLIO_DRIFT", drift_card,
            {"current_alloc": req.current_allocation, "target_alloc": req.target_allocation},
            0.95, "PORTFOLIO-DRIFT-Approved", segment
        )

    return {
        "drift_alerts": alerts,
        "concentration_alerts": concentration_alerts,
        "card": drift_card
    }

@app.post("/api/fraud/detect")
def detect_fraud(req: schemas.FraudDetectionRequest):
    profile = database.get_user_profile(req.user_id)
    segment = profile["lifecycle_segment"] if profile else "YOUNG_EMPLOYED"
    
    # Fetch user transactions for velocity checking
    conn = database.get_db_connection()
    txns = conn.execute("SELECT * FROM transactions WHERE user_id = ? ORDER BY txn_timestamp DESC LIMIT 50", (req.user_id,)).fetchall()
    conn.close()
    
    txns_list = [dict(t) for t in txns]
    
    # 1. Check velocity rules
    now = datetime.now()
    velocity_signals = fraud_sentinel.check_velocity_rules(
        user_id=req.user_id,
        segment=segment,
        recent_txns=txns_list,
        new_txn_amount_paise=int(req.transaction_amount * 100),
        new_txn_timestamp=now,
        is_new_beneficiary=req.is_new_beneficiary
    )
    
    # 2. Verify device fingerprint
    trusted_hashes = ["hash_device_normal_xyz_123"] # Simulation
    device_signal = fraud_sentinel.verify_device_fingerprint(
        user_id=req.user_id,
        segment=segment,
        incoming_hash=req.device_hash,
        trusted_hashes=trusted_hashes
    )
    
    all_signals = []
    if velocity_signals:
        all_signals.extend(velocity_signals)
    if device_signal:
        all_signals.append(device_signal)
        
    is_anomaly = len(all_signals) > 0
    action = "allow"
    
    if is_anomaly:
        top_signal = sorted(all_signals, key=lambda s: s["risk_score"], reverse=True)[0]
        action = top_signal["action"].lower()
        
        # Log fraud event to DB
        database.log_fraud_event(
            str(uuid.uuid4()), req.user_id, 
            top_signal.get("signal_type", "VELOCITY"),
            top_signal.get("severity", "HIGH"),
            top_signal.get("risk_score", 0.8),
            {"amount": req.transaction_amount, "signals": all_signals},
            action.upper()
        )
        
        # Generate Security Alert Card
        card = avatar_engine.generate_micro_copy_card(
            "FRAUD_ALERT", segment,
            {"description": top_signal["description"], "risk_score": top_signal["risk_score"]}
        )
        database.log_audit_trail(
            card["cardId"], req.user_id, "FRAUD_ALERT", card,
            {"amount": req.transaction_amount, "device_hash": req.device_hash},
            0.99, "SEC-ALERT-FRAUD-BLOCKED", segment
        )
        return {"is_anomaly": True, "action": action, "signals": all_signals, "card": card}
        
    return {"is_anomaly": False, "action": "allow", "signals": []}

@app.post("/api/consent/update")
def update_consent(req: schemas.ConsentUpdateRequest):
    database.save_consent_record(
        consent_id=str(uuid.uuid4()),
        user_id=req.user_id,
        data_category=req.data_category,
        status=req.consent_status,
        reason=req.reason
    )
    return {"status": "success", "category": req.data_category, "consent_status": req.consent_status}

@app.get("/api/avatar/cards/{user_id}")
def get_avatar_cards(user_id: str):
    profile = database.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
        
    segment = profile["lifecycle_segment"]
    financials = database.get_user_financials(user_id)
    
    cards = []
    
    # 1. WHS improvement card
    score = profile["wealth_health_score"] or 75
    grade = "A+" if score >= 90 else "A" if score >= 80 else "B" if score >= 65 else "C" if score >= 50 else "D" if score >= 35 else "F"
    whs_card = avatar_engine.generate_micro_copy_card(
        "WHS_IMPROVEMENT", segment,
        {"score": score, "grade": grade, "top_action": "Enhance Insurance or Rebalance holdings"}
    )
    cards.append(whs_card)
    
    # 2. Tax card (check consent first)
    consent_tax = next((c for c in financials["consents"] if c["data_category"] == "TAX_PROFILING" and c["consent_status"] == "GRANTED"), None)
    tax_profile = financials["tax_profile"]
    if consent_tax and tax_profile:
        remaining_80c = tax_profile.get("sec_80c_remaining_paise", 15000000) / 100.0
        if remaining_80c > 0:
            tax_card = avatar_engine.generate_micro_copy_card(
                "TAX_80C", segment,
                {"remaining": int(remaining_80c), "instrument": "ELSS Mutual Fund"}
            )
            cards.append(tax_card)
            
    # 3. 80TTB card for Senior segment
    if segment.upper() == "SENIOR" and consent_tax and tax_profile:
        fd_interest = tax_profile.get("fd_interest_earned_paise", 0) / 100.0
        if fd_interest > 0:
            ttb_card = avatar_engine.generate_micro_copy_card(
                "SENIOR_80TTB", segment,
                {"fd_interest": int(fd_interest)}
            )
            cards.append(ttb_card)

    # 4. Portfolio Drift card
    consent_portfolio = next((c for c in financials["consents"] if c["data_category"] == "INVESTMENT_DATA" and c["consent_status"] == "GRANTED"), None)
    if consent_portfolio:
        # Calculate current allocation
        holdings = financials["holdings"]
        total_val = financials["total_investments_paise"] / 100.0
        curr_alloc = {}
        for h in holdings:
            ac = h["asset_class"]
            val = h["current_value_paise"] / 100.0
            curr_alloc[ac] = curr_alloc.get(ac, 0.0) + (val / total_val * 100.0) if total_val > 0 else 0.0
            
        target_alloc = {"EQUITY": 60.0, "DEBT": 30.0, "GOLD": 10.0} # Target blueprint
        drifts = portfolio_advisor.detect_drift(curr_alloc, target_alloc)
        if drifts:
            top_drift = drifts[0]
            drift_card = avatar_engine.generate_micro_copy_card(
                "PORTFOLIO_DRIFT", segment,
                {
                    "asset_class": top_drift["asset_class"],
                    "drift": top_drift["drift_pct"],
                    "direction": top_drift["direction"],
                    "current": round(top_drift["current_pct"], 1),
                    "target": round(top_drift["target_pct"], 1)
                }
            )
            cards.append(drift_card)

    # 5. Salary Splitter for Young Employed
    consent_spending = next((c for c in financials["consents"] if c["data_category"] == "SPENDING_ANALYSIS" and c["consent_status"] == "GRANTED"), None)
    if segment.upper() == "YOUNG_EMPLOYED" and consent_spending:
        # Check if salary was recently credited
        salary_tx = next((t for t in financials["transactions"] if t["spend_category"] == "SALARY"), None)
        if salary_tx:
            split_card = avatar_engine.generate_micro_copy_card(
                "SALARY_SPLIT", segment,
                {
                    "net_salary": int(salary_tx["amount_paise"] / 100),
                    "ef_contribution": 15000,
                    "elss_sip": 5000,
                    "nps_contrib": 3000,
                    "tax_saving": 2400
                }
            )
            cards.append(split_card)
            
    # 6. Active security warning cards
    conn = database.get_db_connection()
    open_fraud = conn.execute("SELECT * FROM fraud_events WHERE user_id = ? AND resolution_status = 'OPEN'", (user_id,)).fetchone()
    conn.close()
    if open_fraud:
        sec_card = avatar_engine.generate_micro_copy_card(
            "FRAUD_ALERT", segment,
            {"description": f"Suspicious {open_fraud['event_type']} alert remains un-dismissed.", "risk_score": open_fraud["risk_score"]}
        )
        # Security alerts appear at top of cards list
        cards.insert(0, sec_card)
            
    return cards

@app.post("/api/auth/step-up")
def verify_step_up_auth(req: schemas.StepUpAuthRequest):
    """
    Handles Multi-factor Step-Up Authentication challenge.
    For simulation, a valid otp_code '1234' or biometric_matched = True approves the flow.
    """
    if req.otp_code == "1234" or req.biometric_matched:
        # Register validation in audit trail log
        database.log_audit_trail(
            str(uuid.uuid4()), req.user_id, "STEP_UP_AUTH_APPROVED",
            {"action": req.action, "auth_level": req.auth_level_required},
            {"device_status": "trusted_biometric_gate_match"},
            1.0, "AUTH-GATE-L" + str(req.auth_level_required), "ALL"
        )
        return {"status": "approved", "message": "Step-up validation succeeded. Transaction authorized."}
    else:
        # Log block event
        database.log_fraud_event(
            str(uuid.uuid4()), req.user_id, "MFA_FAILED", "HIGH", 0.90,
            {"action": req.action, "otp_attempt": req.otp_code},
            "BLOCK"
        )
        raise HTTPException(status_code=401, detail="Invalid Multi-Factor validation. Transaction rejected.")

@app.post("/api/auth/login")
def login_user(req: schemas.LoginRequest):
    """
    Simulated OAuth/SSO login validator.
    Maps test credentials to seeded DB IDs.
    """
    credentials = {
        "arjun": ("password123", "11111111-1111-1111-1111-111111111111"),
        "meena": ("password123", "22222222-2222-2222-2222-222222222222"),
        "priya": ("password123", "33333333-3333-3333-3333-333333333333"),
        "rahul": ("password123", "44444444-4444-4444-4444-444444444444")
    }
    username = req.username.lower().strip()
    if username in credentials:
        expected_pass, user_id = credentials[username]
        if expected_pass == req.password:
            profile = database.get_user_profile(user_id)
            return {
                "status": "success",
                "user_id": user_id,
                "name": profile["name"] if profile else username.capitalize(),
                "segment": profile["lifecycle_segment"] if profile else "YOUNG_EMPLOYED"
            }
    raise HTTPException(status_code=401, detail="Invalid username or password. Use arjun/meena/priya/rahul and password123")

