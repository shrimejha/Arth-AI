from typing import Dict, List, Optional
import time

SEBI_FOOTER = (
    "REGULATORY DISCLOSURE (SEBI): Investments in securities market are subject to market risks. "
    "Read all scheme-related documents carefully. Avatar Base is an AI system — not a SEBI-registered IA."
)
TAX_DISCLAIMER = (
    "This is general tax-planning information. Consult a Chartered Accountant for final tax filings."
)

SEGMENT_TONES = {
    "CHILD": "encouraging",
    "STUDENT": "aspirational",
    "YOUNG_EMPLOYED": "efficient",
    "SENIOR": "reassuring"
}

def generate_micro_copy_card(card_type: str, segment: str, data: dict) -> dict:
    """
    Generates a structured 3-part card: What (Headline) -> Why (Reasoning) -> Action (CTA).
    Applies segment-specific tones and legal compliance footers.
    """
    tone = SEGMENT_TONES.get(segment.upper(), "efficient")
    card_id = f"card-{card_type.lower()}-{int(time.time())}"
    
    # Defaults
    accent = "blue"
    type_badge = "Advisory"
    what = ""
    why = ""
    action_label = "View Details"
    action_url = "/dashboard"
    auth_level = 1
    disclosure = SEBI_FOOTER
    data_used = []
    confidence = 0.90
    is_time_sensitive = False
    
    if card_type == "TAX_80C":
        accent = "tax"
        type_badge = "Tax Savings"
        remaining = data.get("remaining", 0)
        savings = int(remaining * 0.30)
        instrument = data.get("instrument", "ELSS Mutual Fund")
        
        if tone == "efficient":
            what = f"Invest ₹{remaining:,} before March 31 — save up to ₹{savings:,} in tax."
            why = f"You have ₹{remaining:,} left in your Section 80C limit this year. Deploying into an {instrument} lowers your taxable income directly."
        elif tone == "reassuring":
            what = f"₹{remaining:,} still available to save on tax — let's put it to work safely."
            why = f"You have ₹{remaining:,} left of your annual tax-saving limit. A safe {instrument} can secure this rebate for you before the March 31 deadline."
        elif tone == "aspirational":
            what = f"Save ₹{savings:,} on tax and build future wealth with ₹{remaining:,} in 80C."
            why = f"Cutting your tax bill by investing ₹{remaining:,} in an {instrument} creates a disciplined compound growth asset for your future goals."
        else:
            what = f"Grow your savings! ₹{remaining:,} can be saved tax-free."
            why = f"Your parents can invest this ₹{remaining:,} in a kids savings growth fund, saving on taxes and planning for your future goals!"
            
        action_label = "Invest Now"
        action_url = f"/invest/80c?amount={remaining}"
        auth_level = 2
        disclosure = TAX_DISCLAIMER
        data_used = ["TAX_PROFILE", "TRANSACTION_HISTORY"]
        confidence = 0.92
        is_time_sensitive = True
        
    elif card_type == "PORTFOLIO_DRIFT":
        accent = "portfolio"
        type_badge = "Portfolio Alert"
        asset_class = data.get("asset_class", "EQUITY")
        drift = data.get("drift", 0.0)
        direction = data.get("direction", "OVERWEIGHT")
        curr = data.get("current", 0.0)
        target = data.get("target", 0.0)
        
        what = f"Your {asset_class} is {direction.lower()} by {abs(drift):.1f}% — rebalancing recommended."
        why = f"Market movements shifted your allocation. {asset_class} is currently {curr}% vs your target of {target}%. Rebalancing helps lock in gains and control risk."
        action_label = "Review Rebalancing Options"
        action_url = f"/portfolio/rebalance"
        auth_level = 2
        disclosure = SEBI_FOOTER
        data_used = ["PORTFOLIO_DATA", "MARKET_DATA"]
        confidence = 0.95
        
    elif card_type == "SALARY_SPLIT":
        accent = "salary"
        type_badge = "Salary Day Splitter"
        net_salary = data.get("net_salary", 0)
        elss_sip = data.get("elss_sip", 0)
        nps_contrib = data.get("nps_contrib", 0)
        ef_contrib = data.get("ef_contrib", 0)
        tax_saved = data.get("tax_saving", 0)
        
        what = f"Your salary of ₹{net_salary:,} is credited. Here is the smart split."
        why = f"We suggest allocating ₹{ef_contrib:,} to your emergency fund, ₹{elss_sip:,} to your ELSS SIP, and ₹{nps_contrib:,} to NPS. This split saves an estimated ₹{tax_saved:,} in taxes."
        action_label = "Confirm Split & Invest"
        action_url = "/salary-split/confirm"
        auth_level = 2
        disclosure = SEBI_FOOTER + " " + TAX_DISCLAIMER
        data_used = ["TRANSACTION_HISTORY", "TAX_PROFILE", "PORTFOLIO_DATA"]
        confidence = 0.91
        is_time_sensitive = True
        
    elif card_type == "FRAUD_ALERT":
        accent = "fraud"
        type_badge = "Security Alert"
        desc = data.get("description", "We detected unusual transactions.")
        risk = int(data.get("risk_score", 0.8) * 100)
        
        what = "Unusual activity detected on your account — block recommended."
        why = f"{desc} Risk score: {risk}%. If this wasn't you, block your debit card and account immediately to prevent unauthorized outflows."
        action_label = "Block Account Now"
        action_url = "/emergency/block-account"
        auth_level = 1
        disclosure = "This is a real-time security alert from Avatar Base Fraud Sentinel. Contact bank support: 1800-XXX-XXXX."
        data_used = ["TRANSACTION_HISTORY", "DEVICE_FINGERPRINT", "BEHAVIORAL_BIOMETRICS"]
        confidence = data.get("risk_score", 0.85)
        is_time_sensitive = True
        
    elif card_type == "WHS_IMPROVEMENT":
        accent = "whs"
        type_badge = "Wealth Health"
        score = data.get("score", 75)
        grade = data.get("grade", "B")
        top_action = data.get("top_action", "Build Emergency Reserve")
        
        what = f"Your Wealth Health Score is {score}/100 — Grade {grade}"
        why = f"Your biggest opportunity to boost your score is: '{top_action}'. Strengthening this pillar raises your long-term security and score."
        action_label = top_action
        action_url = "/plan/whs-improvement"
        auth_level = 1
        disclosure = "WHS is an illustrative dashboard index indicator, not a yield guarantee."
        data_used = ["TRANSACTION_HISTORY", "PORTFOLIO_DATA", "INSURANCE_DATA"]
        confidence = 0.90
        
    elif card_type == "SENIOR_80TTB":
        accent = "tax"
        type_badge = "Section 80TTB"
        fd_interest = data.get("fd_interest", 0)
        eligible = min(fd_interest, 50000)
        
        what = f"Claim up to ₹{eligible:,} in tax-free FD interest under Section 80TTB."
        why = f"You have earned ₹{fd_interest:,} in interest. Under Section 80TTB, senior citizens can deduct up to ₹50,000 of interest income from their tax liabilities."
        action_label = "Optimize FDs"
        action_url = "/tax/80ttb"
        auth_level = 2
        disclosure = TAX_DISCLAIMER
        data_used = ["TAX_PROFILE", "TRANSACTION_HISTORY"]
        confidence = 0.95

    return {
        "cardId": card_id,
        "type": card_type,
        "segment": segment,
        "accent": accent,
        "typeBadge": type_badge,
        "what": what,
        "why": why,
        "actionLabel": action_label,
        "actionUrl": action_url,
        "authLevel": auth_level,
        "disclosure": disclosure,
        "dataUsed": data_used,
        "explainRef": f"/why/{card_id}",
        "confidence": confidence,
        "isTimeSensitive": is_time_sensitive,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

def generate_message(segment: str) -> str:
    """Backward compatibility greeting route."""
    messages = {
        "children": "Hey! Did you know saving ₹10 a day buys a huge toy at the end of the year?",
        "student": "Welcome to your financial journey. Nova is ready. First step: Build an emergency fund.",
        "young_employed": "Salary credited! Arya suggests allocating 20% to your investments.",
        "senior": "Namaste. Sahaya is monitoring your account. We blocked 2 suspicious IPs today."
    }
    return messages.get(segment.lower(), "Welcome to Avatar Base AI.")
