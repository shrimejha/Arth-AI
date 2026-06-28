import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "avatar_base.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")
SEED_PATH = os.path.join(os.path.dirname(__file__), "seed_data.sql")

def get_db_connection():
    """Establishes connection to the SQLite database and configures output format."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row # Allows dictionary-like access to rows
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    """Initializes database schema and populates it with seed data."""
    print(f"Initializing SQLite database at: {DB_PATH}")
    
    # Read and execute schema
    if os.path.exists(SCHEMA_PATH):
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema_sql = f.read()
        conn = get_db_connection()
        try:
            conn.executescript(schema_sql)
            conn.commit()
            print("Database schema successfully created/updated.")
        except Exception as e:
            print(f"Error applying database schema: {e}")
        finally:
            conn.close()
    else:
        print("Error: schema.sql file not found!")

    # Read and execute seed data
    if os.path.exists(SEED_PATH):
        with open(SEED_PATH, "r", encoding="utf-8") as f:
            seed_sql = f.read()
        conn = get_db_connection()
        try:
            # We split statements if executescript has issues, but executescript handles comments fine in sqlite3.
            conn.executescript(seed_sql)
            conn.commit()
            print("Database successfully seeded with demo accounts.")
        except Exception as e:
            print(f"Error applying database seed: {e}")
        finally:
            conn.close()
    else:
        print("Error: seed_data.sql file not found!")

# Helper functions to query the database
def get_user_profile(user_id: str):
    conn = get_db_connection()
    try:
        user = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
        return dict(user) if user else None
    finally:
        conn.close()

def get_user_financials(user_id: str):
    conn = get_db_connection()
    try:
        profile = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
        if not profile:
            return None
        
        # Aggregate stats from holdings & transactions
        holdings = conn.execute("SELECT * FROM portfolio_holdings WHERE user_id = ? AND is_active = 1", (user_id,)).fetchall()
        holdings_list = [dict(h) for h in holdings]
        total_investments = sum(h["current_value_paise"] for h in holdings_list) if holdings_list else 0
        
        # Recent transactions in last 30 days
        txns = conn.execute("SELECT * FROM transactions WHERE user_id = ? ORDER BY txn_timestamp DESC", (user_id,)).fetchall()
        txns_list = [dict(t) for t in txns]
        
        # Deductions
        tax = conn.execute("SELECT * FROM tax_profiles WHERE user_id = ? ORDER BY fiscal_year DESC LIMIT 1", (user_id,)).fetchone()
        tax_profile = dict(tax) if tax else None
        
        # Consent Settings
        consents = conn.execute("SELECT * FROM consent_records WHERE user_id = ?", (user_id,)).fetchall()
        consents_list = [dict(c) for c in consents]

        return {
            "profile": dict(profile),
            "holdings": holdings_list,
            "total_investments_paise": total_investments,
            "transactions": txns_list,
            "tax_profile": tax_profile,
            "consents": consents_list
        }
    finally:
        conn.close()

def save_consent_record(consent_id: str, user_id: str, data_category: str, status: str, reason: str = None):
    conn = get_db_connection()
    try:
        now_str = datetime.now().isoformat()
        expiry_str = datetime(datetime.now().year + 1, datetime.now().month, datetime.now().day).isoformat()
        
        # Check if record exists
        existing = conn.execute("SELECT consent_id FROM consent_records WHERE user_id = ? AND data_category = ?", (user_id, data_category)).fetchone()
        if existing:
            conn.execute(
                """UPDATE consent_records 
                   SET consent_status = ?, revoked_at = ?, revocation_reason = ?, granted_at = ?
                   WHERE user_id = ? AND data_category = ?""",
                (status, now_str if status == "REVOKED" else None, reason, now_str if status == "GRANTED" else None, user_id, data_category)
            )
        else:
            conn.execute(
                """INSERT INTO consent_records 
                   (consent_id, user_id, data_category, purpose, purpose_code, consent_status, consent_version, granted_at, expires_at, channel) 
                   VALUES (?, ?, ?, ?, ?, ?, 'v1.0', ?, ?, 'MOBILE_APP')""",
                (consent_id, user_id, data_category, f"Purpose for {data_category}", f"PURP_{data_category}", status, now_str if status == "GRANTED" else None, expiry_str)
            )
        conn.commit()
    finally:
        conn.close()

def log_audit_trail(audit_id: str, user_id: str, rec_type: str, payload: dict, inputs: dict, score: float, sebi_ref: str, segment: str):
    conn = get_db_connection()
    try:
        now_str = datetime.now().isoformat()
        
        # Fetch previous entry hash for chaining
        prev = conn.execute("SELECT entry_hash FROM ai_recommendation_audit WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", (user_id,)).fetchone()
        prev_hash = prev["entry_hash"] if prev else "GENESIS_HASH_AVATAR_BASE"
        
        # Simple chaining hash representation
        chain_input = f"{prev_hash}:{json.dumps(payload, sort_keys=True)}:{json.dumps(inputs, sort_keys=True)}"
        import hashlib
        entry_hash = hashlib.sha256(chain_input.encode()).hexdigest()
        
        conn.execute(
            """INSERT INTO ai_recommendation_audit
               (audit_id, user_id, recommendation_type, recommendation_payload, input_data_snapshot, 
                model_version, model_weights_hash, confidence_score, sebi_ra_validation_ref, 
                risk_disclosure_shown, user_action, lifecycle_segment, fiscal_year, created_at, entry_hash, prev_entry_hash)
               VALUES (?, ?, ?, ?, ?, 'v1.2.0', 'sha256_model_weights_xyz_777', ?, ?, 1, 'ACCEPTED', ?, '2025-26', ?, ?, ?)""",
            (audit_id, user_id, rec_type, json.dumps(payload), json.dumps(inputs), score, sebi_ref, segment, now_str, entry_hash, prev_hash)
        )
        conn.commit()
    finally:
        conn.close()

def log_fraud_event(event_id: str, user_id: str, event_type: str, severity: str, risk_score: float, features: dict, action_taken: str):
    conn = get_db_connection()
    try:
        now_str = datetime.now().isoformat()
        conn.execute(
            """INSERT INTO fraud_events
               (event_id, user_id, event_type, severity, risk_score, features_snapshot, action_taken, resolution_status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)""",
            (event_id, user_id, event_type, severity, risk_score, json.dumps(features), action_taken, now_str)
        )
        conn.commit()
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
