from typing import List, Dict, Tuple, Optional
from datetime import date

SEC_80C_CEILING = 150000.0  # ₹1.5L cap
NPS_80CCD1B_CEILING = 50000.0 # ₹50k additional

# Slabs for FY 2025-26
NEW_REGIME_SLABS = [
    (400000, 0.00),
    (800000, 0.05),
    (1200000, 0.10),
    (1600000, 0.15),
    (2000000, 0.20),
    (2400000, 0.25),
    (float('inf'), 0.30)
]

OLD_REGIME_SLABS = [
    (250000, 0.00),
    (500000, 0.05),
    (1000000, 0.20),
    (float('inf'), 0.30)
]

OLD_REGIME_SLABS_SENIOR = [
    (300000, 0.00),
    (500000, 0.05),
    (1000000, 0.20),
    (float('inf'), 0.30)
]

HEALTH_ED_CESS = 0.04

def calculate_slab_tax(income: float, slabs: List[Tuple[float, float]]) -> float:
    tax = 0.0
    prev = 0.0
    for limit, rate in slabs:
        if income <= prev:
            break
        taxable_in_slab = min(income, limit) - prev
        tax += taxable_in_slab * rate
        prev = limit
    return round(tax, 2)

def calculate_surcharge(income: float, tax: float, is_new: bool) -> float:
    rate = 0.0
    if income > 50000000: rate = 0.37
    elif income > 20000000: rate = 0.25
    elif income > 10000000: rate = 0.15
    elif income > 5000000: rate = 0.10
    
    if is_new:
        rate = min(rate, 0.25)
    return round(tax * rate, 2)

def calculate_tax_old_vs_new(
    gross_income: float, is_senior: bool,
    sec_80c: float, sec_80d: float, nps_80ccd1b: float,
    hra_eligible: float, home_loan_interest: float,
    sec_80ttb: float, other_deductions: float
) -> Dict:
    # ── OLD REGIME ──
    std_ded_old = 50000.0
    total_ded_old = std_ded_old + min(sec_80c, SEC_80C_CEILING) + sec_80d + min(nps_80ccd1b, NPS_80CCD1B_CEILING) + hra_eligible + home_loan_interest + sec_80ttb + other_deductions
    taxable_old = max(0.0, gross_income - total_ded_old)
    slabs_old = OLD_REGIME_SLABS_SENIOR if is_senior else OLD_REGIME_SLABS
    tax_old = calculate_slab_tax(taxable_old, slabs_old)
    surcharge_old = calculate_surcharge(taxable_old, tax_old, False)
    rebate_old = min(tax_old + surcharge_old, 12500.0) if taxable_old <= 500000 else 0.0
    total_tax_old = max(0.0, tax_old + surcharge_old - rebate_old) * (1.0 + HEALTH_ED_CESS)
    
    # ── NEW REGIME ──
    std_ded_new = 75000.0 # Standard deduction in new regime (FY25-26 Budget)
    taxable_new = max(0.0, gross_income - std_ded_new)
    tax_new = calculate_slab_tax(taxable_new, NEW_REGIME_SLABS)
    surcharge_new = calculate_surcharge(taxable_new, tax_new, True)
    rebate_new = (tax_new + surcharge_new) if taxable_new <= 700000 else 0.0
    total_tax_new = max(0.0, tax_new + surcharge_new - rebate_new) * (1.0 + HEALTH_ED_CESS)

    recommended = "NEW" if total_tax_new < total_tax_old else "OLD"
    savings = abs(total_tax_old - total_tax_new)
    
    verdict = (
        f"New regime saves ₹{savings:,.2f}/year. Standard deduction is ₹75,000. Slabs are lower."
        if recommended == "NEW"
        else f"Old regime saves ₹{savings:,.2f}/year. Your deductions (₹{total_ded_old:,.2f}) reduce your taxable income significantly."
    )

    return {
        "old_regime": {
            "taxable_income": taxable_old,
            "total_deductions": total_ded_old,
            "tax": round(total_tax_old, 2),
            "effective_rate": round(total_tax_old / gross_income * 100, 2) if gross_income > 0 else 0.0
        },
        "new_regime": {
            "taxable_income": taxable_new,
            "tax": round(total_tax_new, 2),
            "effective_rate": round(total_tax_new / gross_income * 100, 2) if gross_income > 0 else 0.0
        },
        "recommended": recommended,
        "tax_saved": round(savings, 2),
        "verdict_explanation": verdict
    }

def get_80c_recommendations(invested: float, months_remaining: int) -> Dict:
    utilized = min(invested, SEC_80C_CEILING)
    remaining = max(SEC_80C_CEILING - utilized, 0.0)
    
    urgency = "CRITICAL" if months_remaining <= 1 else "HIGH" if months_remaining <= 3 else "MEDIUM" if months_remaining <= 6 else "LOW"
    
    recommendations = []
    if remaining > 0:
        recommendations = [
            {
                "code": "ELSS",
                "name": "ELSS Mutual Fund",
                "amount": round(remaining * 0.60, 2),
                "lock_in": "3 years",
                "expected_cagr": "12.0%",
                "risk": "HIGH",
                "liquidity_score": 4,
                "tax_on_maturity": "TAXABLE_LTCG",
                "rationale": "Market-linked equity saver with the shortest lock-in period."
            },
            {
                "code": "PPF",
                "name": "Public Provident Fund",
                "amount": round(remaining * 0.30, 2),
                "lock_in": "15 years",
                "expected_cagr": "7.1%",
                "risk": "LOW",
                "liquidity_score": 1,
                "tax_on_maturity": "EXEMPT",
                "rationale": "Government-backed, safe, tax-free return (EEE status)."
            },
            {
                "code": "NSC",
                "name": "National Savings Certificate",
                "amount": round(remaining * 0.10, 2),
                "lock_in": "5 years",
                "expected_cagr": "7.7%",
                "risk": "LOW",
                "liquidity_score": 2,
                "tax_on_maturity": "TAXABLE_INCOME",
                "rationale": "Fixed interest rate, completely secure government savings scheme."
            }
        ]
        
    return {
        "utilized": utilized,
        "remaining": remaining,
        "urgency": urgency,
        "recommendations": recommendations,
        "monthly_target": round(remaining / max(months_remaining, 1), 2)
    }

def analyze_capital_gains_tax(
    realized_ltcg: float, realized_stcg: float,
    realized_ltcl: float, realized_stcl: float,
    holdings: List[Dict], today: date = None
) -> Dict:
    if today is None:
        today = date.today()
    
    # Calculate days left to financial year end (March 31)
    fy_year = today.year if today.month > 3 else (today.year - 1)
    fy_end = date(fy_year + 1, 3, 31)
    days_left = max(0, (fy_end - today).days)
    
    net_ltcg = max(0.0, realized_ltcg - realized_ltcl)
    net_stcg = max(0.0, realized_stcg - realized_stcl)
    
    # Exemption of ₹1L on LTCG Equity u/s 112A
    taxable_ltcg = max(0.0, net_ltcg - 100000.0)
    
    ltcg_tax = taxable_ltcg * 0.125  # 12.5% LTCG post-Budget 2024
    stcg_tax = net_stcg * 0.20       # 20% STCG post-Budget 2024
    total_tax = ltcg_tax + stcg_tax
    
    # Harvest candidates (unrealized losses)
    candidates = []
    for h in holdings:
        gain = h.get("unrealized_gain", 0.0)
        if gain >= 0:
            continue
        loss = abs(gain)
        purchase_date_str = h.get("purchase_date")
        if not purchase_date_str:
            continue
        pdate = date.fromisoformat(purchase_date_str)
        days_held = (today - pdate).days
        gain_type = "LTCG" if days_held > 365 else "STCG"
        
        # Estimate tax savings if booked
        saving = loss * 0.125 if gain_type == "LTCG" else loss * 0.20
        candidates.append({
            "holding_id": h.get("holding_id"),
            "instrument_name": h.get("instrument_name"),
            "unrealized_loss": loss,
            "tax_saving": round(saving, 2),
            "gain_type": gain_type,
            "days_held": days_held,
            "rationale": f"Booking ₹{loss:,.2f} loss in {h.get('instrument_name')} saves ~₹{saving:,.2f} in {gain_type} tax."
        })
        
    candidates.sort(key=lambda x: x["tax_saving"], reverse=True)
    total_harvest_saving = sum(c["tax_saving"] for c in candidates)
    
    urgency = (
        f"⚠️ CRITICAL: Only {days_left} days left before March 31. Review your tax-loss harvesting immediately."
        if days_left <= 7
        else f"Time-sensitive: {days_left} days left to act before March 31."
    )
    
    return {
        "net_ltcg": net_ltcg,
        "net_stcg": net_stcg,
        "taxable_ltcg": taxable_ltcg,
        "ltcg_tax": round(ltcg_tax, 2),
        "stcg_tax": round(stcg_tax, 2),
        "total_tax": round(total_tax, 2),
        "harvesting_candidates": candidates[:5],
        "potential_saving": round(total_harvest_saving, 2),
        "days_left": days_left,
        "urgency_message": urgency
    }

def calculate_tax(income: float, age: int, inv_80c: float, health_80d: float):
    # Backward compatibility with existing route
    is_senior = age >= 60
    return calculate_tax_old_vs_new(
        gross_income=income,
        is_senior=is_senior,
        sec_80c=inv_80c,
        sec_80d=health_80d,
        nps_80ccd1b=0.0,
        hra_eligible=0.0,
        home_loan_interest=0.0,
        sec_80ttb=0.0,
        other_deductions=0.0
    )
