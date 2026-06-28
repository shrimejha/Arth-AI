import math
from typing import Optional, Tuple, Dict

# Pillar Weights per Segment
SEGMENT_WEIGHTS = {
    "CHILD":          { "cash_reserve": 0.20, "savings_rate": 0.40, "insurance": 0.10, "investment": 0.20, "debt": 0.10 },
    "STUDENT":        { "cash_reserve": 0.25, "savings_rate": 0.35, "insurance": 0.10, "investment": 0.20, "debt": 0.10 },
    "YOUNG_EMPLOYED": { "cash_reserve": 0.20, "savings_rate": 0.20, "insurance": 0.20, "investment": 0.25, "debt": 0.15 },
    "SENIOR":         { "cash_reserve": 0.30, "savings_rate": 0.15, "insurance": 0.25, "investment": 0.15, "debt": 0.15 },
}

SAVINGS_BENCHMARKS = {
    "CHILD": 0.10, "STUDENT": 0.10, "YOUNG_EMPLOYED": 0.20, "SENIOR": 0.15
}

def sigmoid_score(ratio: float, steepness: float = 5.0, midpoint: float = 0.5) -> float:
    """Applies a smooth sigmoid mapping to project any ratio to a 0-100 scale."""
    try:
        return 100.0 / (1.0 + math.exp(-steepness * (ratio - midpoint)))
    except OverflowError:
        return 0.0 if ratio < midpoint else 100.0

def compute_pillar_cash_reserve(income: float, savings: float, current_balance: float) -> Tuple[float, str]:
    monthly_expenses = max(income - savings, 1.0)
    target_reserve = monthly_expenses * 6.0
    ratio = current_balance / target_reserve
    score = min(sigmoid_score(ratio, 5.0, 0.5), 100.0)
    explanation = f"Emergency fund covers {ratio * 6:.1f} months of expenses. Target: 6 months (₹{int(target_reserve):,})"
    return score, explanation

def compute_pillar_savings_rate(income: float, savings: float, sip_missed_last_6m: int, segment: str) -> Tuple[float, str]:
    benchmark = SAVINGS_BENCHMARKS.get(segment, 0.20)
    if income == 0:
        return 0.0, "Income data unavailable"
    
    actual_rate = savings / income
    rate_score = min((actual_rate / benchmark) * 80.0, 80.0)
    consistency_score = max(0.0, 20.0 - (sip_missed_last_6m * 4.0))
    total = rate_score + consistency_score
    explanation = f"Saving {actual_rate * 100:.1f}% of income (benchmark: {benchmark * 100:.0f}%). SIP consistency: {6 - sip_missed_last_6m}/6 months on track."
    return min(total, 100.0), explanation

def compute_pillar_insurance(has_life: bool, life_cover: float, has_health: bool, health_cover: float, family_size: int, income: float) -> Tuple[float, str]:
    annual_income = income * 12.0
    life_score = 0.0
    health_score = 0.0
    msgs = []
    
    # Life Insurance (60% of pillar)
    if has_life and annual_income > 0:
        cover_multiple = life_cover / annual_income
        life_score = min((cover_multiple / 10.0) * 60.0, 60.0)
        msgs.append(f"Life cover: {cover_multiple:.1f}x income (target: 10x)")
    else:
        msgs.append("No life insurance detected - high risk gap")
        
    # Health Insurance (40% of pillar)
    required_health = family_size * 500000.0 # ₹5L per person
    if has_health and required_health > 0:
        health_ratio = min(health_cover / required_health, 1.0)
        health_score = health_ratio * 40.0
        msgs.append(f"Health cover: ₹{int(health_cover):,} for {family_size} members")
    else:
        msgs.append("No health insurance detected")
        
    return life_score + health_score, ". ".join(msgs)

def compute_pillar_investment(active_sip: float, income: float, portfolio_drift: float, total_investments: float) -> Tuple[float, str]:
    if income == 0:
        return 0.0, "Income data unavailable"
    sip_rate = active_sip / income
    sip_score = min((sip_rate / 0.10) * 60.0, 60.0) # 10% rate is target
    drift_penalty = max(0.0, (portfolio_drift - 5.0) * 2.0)
    invest_score = max(sip_score - drift_penalty, 0.0)
    
    annual_income = income * 12.0
    corpus_multiple = total_investments / annual_income if annual_income > 0 else 0.0
    corpus_score = min(corpus_multiple * 8.0, 40.0)
    total = min(invest_score + corpus_score, 100.0)
    explanation = f"Monthly SIP rate: {sip_rate*100:.1f}% of income. Portfolio drift: {portfolio_drift:.1f}%. Corpus: {corpus_multiple:.1f}x annual income."
    return total, explanation

def compute_pillar_debt(emi: float, income: float, credit_utilization: float) -> Tuple[float, str]:
    if income == 0:
        return 100.0, "No debt burden."
    emi_ratio = emi / income
    emi_score = max(0.0, (1.0 - (emi_ratio / 0.30)) * 70.0)
    cc_score = max(0.0, (1.0 - (credit_utilization / 30.0)) * 30.0)
    total = emi_score + cc_score
    explanation = f"EMI burden: {emi_ratio * 100:.1f}% of income (safe limit: 30%). Credit utilization: {credit_utilization:.0f}%."
    return min(total, 100.0), explanation

def compute_score(
    income: float, savings: float, investments: float, debt: float,
    current_savings_balance: float = 0.0,
    has_life_insurance: bool = False, life_cover: float = 0.0,
    has_health_insurance: bool = False, health_cover: float = 0.0,
    family_size: int = 1,
    active_sip_monthly: float = 0.0, sip_missed_last_6m: int = 0,
    portfolio_drift_pct: float = 0.0, emi_monthly: float = 0.0,
    credit_card_utilization_pct: float = 0.0,
    segment: str = "YOUNG_EMPLOYED"
) -> Tuple[int, str, Dict, Dict]:
    """
    Computes segment-weighted Wealth Health Score (0-100) across 5 pillars.
    Returns: (final_score, top_improvement_action, pillar_scores, pillar_explanations)
    """
    weights = SEGMENT_WEIGHTS.get(segment, SEGMENT_WEIGHTS["YOUNG_EMPLOYED"])
    
    # Calculate pillars
    score_cr, expl_cr = compute_pillar_cash_reserve(income, savings, current_savings_balance)
    score_sr, expl_sr = compute_pillar_savings_rate(income, savings, sip_missed_last_6m, segment)
    score_ins, expl_ins = compute_pillar_insurance(has_life_insurance, life_cover, has_health_insurance, health_cover, family_size, income)
    score_inv, expl_inv = compute_pillar_investment(active_sip_monthly, income, portfolio_drift_pct, investments)
    score_dt, expl_dt = compute_pillar_debt(emi_monthly, income, credit_card_utilization_pct)
    
    pillar_scores = {
        "cash_reserve": round(score_cr, 1),
        "savings_rate": round(score_sr, 1),
        "insurance": round(score_ins, 1),
        "investment": round(score_inv, 1),
        "debt": round(score_dt, 1)
    }
    
    pillar_explanations = {
        "cash_reserve": expl_cr,
        "savings_rate": expl_sr,
        "insurance": expl_ins,
        "investment": expl_inv,
        "debt": expl_dt
    }
    
    # Apply segment weights
    weighted_score = (
        score_cr * weights["cash_reserve"] +
        score_sr * weights["savings_rate"] +
        score_ins * weights["insurance"] +
        score_inv * weights["investment"] +
        score_dt * weights["debt"]
    )
    
    final_score = max(0, min(100, int(round(weighted_score))))
    
    # Find worst performing weighted pillar
    worst_pillar = min(pillar_scores.keys(), key=lambda p: pillar_scores[p] * weights[p])
    
    action_map = {
        "cash_reserve": "Build emergency fund to cover at least 6 months of expenses.",
        "savings_rate": "Activate a monthly SIP of at least 10-20% of take-home pay.",
        "insurance": "Add or enhance health and life insurance coverage immediately to plug key risk gaps.",
        "investment": "Rebalance your portfolio holdings to realign with target risk weights.",
        "debt": "Reduce EMI burden or credit card utilization below the 30% safe threshold."
    }
    
    improvement_action = action_map.get(worst_pillar, "Optimize your general asset allocations.")
    
    return final_score, improvement_action, pillar_scores, pillar_explanations
