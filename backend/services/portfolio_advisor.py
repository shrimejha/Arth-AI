from typing import List, Dict, Tuple, Optional

SEBI_DISCLOSURE = (
    "⚠️ REGULATORY DISCLOSURE (SEBI): Investments in securities market are subject to market risks. "
    "Read all scheme-related documents carefully before investing. Past performance is not indicative of future returns. "
    "This is an AI-generated advisory suggestion from Avatar Base. Avatar Base is not a SEBI-registered Investment Adviser. "
    "For personalised advice, consult a SEBI-registered Investment Adviser. "
    "SEBI Registration: [IA-XXXXX] — Research Analyst: [RA-XXXXXX]."
)

DRIFT_THRESHOLD_PCT = 5.0
CONCENTRATION_THRESHOLD_PCT = 20.0

# Ordered order of risk profiles
RISK_ORDER = {
    "CONSERVATIVE": 1,
    "MODERATE": 2,
    "AGGRESSIVE": 3,
    "GROWTH": 4,
    "LOW": 1,
    "MEDIUM": 2,
    "HIGH": 3,
    "VERY_HIGH": 4
}

def detect_drift(current_allocation: Dict[str, float], target_allocation: Dict[str, float], threshold: float = DRIFT_THRESHOLD_PCT) -> List[Dict]:
    """
    Checks if any asset class allocation deviates from the target by more than the threshold.
    """
    alerts = []
    for asset_class, target_pct in target_allocation.items():
        curr_pct = current_allocation.get(asset_class, 0.0)
        drift = curr_pct - target_pct
        if abs(drift) >= threshold:
            direction = "OVERWEIGHT" if drift > 0 else "UNDERWEIGHT"
            action = (
                f"Trim {asset_class} by ~{abs(drift):.1f}% and reallocate profits into underweight assets."
                if direction == "OVERWEIGHT"
                else f"Top up {asset_class} by ~{abs(drift):.1f}% to align with target allocations."
            )
            alerts.append({
                "asset_class": asset_class,
                "current_pct": curr_pct,
                "target_pct": target_pct,
                "drift_pct": round(drift, 2),
                "direction": direction,
                "action": action,
                "sebi_disclosure": SEBI_DISCLOSURE
            })
    return alerts

def detect_concentration_risks(holdings: List[Dict], total_portfolio_value: float) -> List[Dict]:
    """
    Checks if single stock or sector concentration exceeds the 20% limit.
    """
    if total_portfolio_value == 0:
        return []
        
    alerts = []
    stock_values: Dict[str, Dict] = {}
    sector_values: Dict[str, float] = {}
    
    for h in holdings:
        val = h.get("current_value_paise", 0.0) / 100.0 # Convert to Rs
        pct = (val / total_portfolio_value) * 100.0
        
        # Track single stocks
        if h.get("instrument_type") == "EQUITY":
            isin = h.get("isin", h.get("instrument_name", "UNKNOWN"))
            if isin not in stock_values:
                stock_values[isin] = {"name": h.get("instrument_name"), "pct": 0.0}
            stock_values[isin]["pct"] += pct
            
            # Track sectors
            sector = h.get("sector", "UNKNOWN")
            sector_values[sector] = sector_values.get(sector, 0.0) + pct
            
    # Stock Concentration Alert
    for isin, info in stock_values.items():
        if info["pct"] > CONCENTRATION_THRESHOLD_PCT:
            alerts.append({
                "type": "SINGLE_STOCK",
                "identifier": isin,
                "display_name": info["name"],
                "current_pct": round(info["pct"], 2),
                "action": f"Single stock '{info['name']}' is {info['pct']:.1f}% of your portfolio. Consider booking profits to diversify."
            })
            
    # Sector Concentration Alert
    for sector, pct in sector_values.items():
        if pct > CONCENTRATION_THRESHOLD_PCT:
            alerts.append({
                "type": "SECTOR",
                "identifier": sector,
                "display_name": sector,
                "current_pct": round(pct, 2),
                "action": f"Sector '{sector}' is {pct:.1f}% of your portfolio. Diversify across other sectors to reduce systemic risk."
            })
            
    return alerts

def check_execution_suitability(
    user_risk_profile: str,
    instrument_risk_level: str,
    instrument_isin: str,
    sebi_ra_validated: bool
) -> Dict:
    """
    Blocks transactions if equity picks are not SEBI-RA validated.
    Warns users if there is a suitability mismatch.
    """
    if not sebi_ra_validated:
        return {
            "is_suitable": False,
            "can_override": False,
            "block_reason": (
                "COMPLIANCE BLOCK: This instrument has not been validated by a SEBI-registered Research Analyst. "
                "Advisory execution blocked."
            ),
            "sebi_disclosure": SEBI_DISCLOSURE
        }
        
    user_tol = RISK_ORDER.get(user_risk_profile.upper(), 1)
    inst_risk = RISK_ORDER.get(instrument_risk_level.upper(), 1)
    
    if inst_risk > user_tol:
        return {
            "is_suitable": False,
            "can_override": True,
            "block_reason": (
                f"Suitability warning: This instrument is rated '{instrument_risk_level}' risk, "
                f"but your risk profile is '{user_risk_profile}'. Confirm to override with risk acknowledgment."
            ),
            "sebi_disclosure": SEBI_DISCLOSURE
        }
        
    return {
        "is_suitable": True,
        "can_override": False,
        "block_reason": None,
        "sebi_disclosure": SEBI_DISCLOSURE
    }
