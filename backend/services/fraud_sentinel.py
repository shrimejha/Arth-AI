from typing import List, Dict, Optional
from datetime import datetime, timedelta

class VelocityRule:
    def __init__(self, rule_id: str, description: str, window_minutes: int, max_txn_count: int, max_amount_paise: int, segments: List[str], action: str):
        self.rule_id = rule_id
        self.description = description
        self.window_minutes = window_minutes
        self.max_txn_count = max_txn_count
        self.max_amount_paise = max_amount_paise
        self.segments = segments
        self.action = action # 'BLOCK' | 'STEP_UP_AUTH' | 'ALERT_RM'

# Velocity Rules as specified in blueprint
VELOCITY_RULES = [
    VelocityRule("VR001", "High-frequency small transactions (structuring pattern)", 60, 10, 50000000, ["ALL"], "BLOCK"),
    VelocityRule("VR002", "Multiple large transfers in 24h", 1440, 3, 500000000, ["ALL"], "STEP_UP_AUTH"),
    VelocityRule("VR003", "Senior: any unusual large outflow", 1440, 2, 50000000, ["SENIOR"], "ALERT_RM"),
    VelocityRule("VR004", "Senior: new beneficiary + large transfer", 60, 1, 10000000, ["SENIOR"], "BLOCK"),
    VelocityRule("VR005", "Midnight hour transaction (11PM–5AM) for Senior", 60, 5, 20000000, ["SENIOR"], "STEP_UP_AUTH"),
]

def check_velocity_rules(
    user_id: str, segment: str, recent_txns: List[Dict],
    new_txn_amount_paise: int, new_txn_timestamp: datetime,
    is_new_beneficiary: bool = False
) -> List[Dict]:
    """
    Evaluates velocity rules based on user segment and recent transactions.
    """
    signals = []
    
    applicable_rules = [
        r for r in VELOCITY_RULES 
        if "ALL" in r.segments or segment.upper() in r.segments
    ]
    
    for rule in applicable_rules:
        # Check rule condition filters
        if rule.rule_id == "VR004" and not is_new_beneficiary:
            continue
        if rule.rule_id == "VR005":
            hour = new_txn_timestamp.hour
            if hour >= 5 and hour < 23:
                continue
                
        window_start = new_txn_timestamp - timedelta(minutes=rule.window_minutes)
        window_txns = []
        for t in recent_txns:
            # Parse timestamp if string
            ts = t.get("txn_timestamp")
            if isinstance(ts, str):
                try:
                    ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except ValueError:
                    ts = new_txn_timestamp # Fallback
            if ts and ts >= window_start:
                window_txns.append(t)
                
        window_count = len(window_txns)
        window_amount = sum(t.get("amount_paise", 0) for t in window_txns) + new_txn_amount_paise
        
        if window_count >= rule.max_txn_count or window_amount >= rule.max_amount_paise:
            # Calculate normalization score
            risk_score = min(
                (window_count / rule.max_txn_count + window_amount / rule.max_amount_paise) / 2.0,
                1.0
            )
            signals.append({
                "rule_id": rule.rule_id,
                "signal_type": "VELOCITY",
                "severity": "HIGH" if risk_score > 0.7 else "MEDIUM",
                "risk_score": round(risk_score, 4),
                "description": rule.description,
                "action": rule.action,
                "auto_blocked": rule.action == "BLOCK"
            })
            
    return signals

def verify_device_fingerprint(
    user_id: str, segment: str, incoming_hash: str, trusted_hashes: List[str]
) -> Optional[Dict]:
    """
    Verifies if device fingerprint is recognized. For seniors, unrecognized device prompts block.
    """
    if not trusted_hashes or incoming_hash in trusted_hashes:
        return None
        
    severity = "HIGH" if segment.upper() == "SENIOR" else "MEDIUM"
    action = "BLOCK" if segment.upper() == "SENIOR" else "STEP_UP_AUTH"
    
    return {
        "signal_type": "DEVICE",
        "severity": severity,
        "risk_score": 0.85 if segment.upper() == "SENIOR" else 0.60,
        "description": "Unrecognized device fingerprint detected.",
        "action": action,
        "auto_blocked": action == "BLOCK"
    }

def score_biometric_anomaly(
    user_id: str, segment: str,
    avg_dwell_ms: float, baseline_dwell_ms: float,
    baseline_variance: float
) -> Optional[Dict]:
    """
    Checks if session biometric keystroke dynamics deviate significantly from baseline.
    """
    if baseline_variance <= 0:
        baseline_variance = 1.0
    deviation = abs(avg_dwell_ms - baseline_dwell_ms)
    z_score = deviation / (baseline_variance ** 0.5)
    
    if z_score > 3.0:
        return {
            "signal_type": "BIOMETRIC",
            "severity": "HIGH" if segment.upper() == "SENIOR" else "MEDIUM",
            "risk_score": min(z_score / 5.0, 1.0),
            "description": f"Behavioral biometrics z-score deviation too high (z={z_score:.2f}). Possible account takeover.",
            "action": "STEP_UP_AUTH",
            "auto_blocked": False
        }
    return None

def check_anomaly(amount: float, velocity_24h: int, location: str):
    # Backward compatibility with existing route
    if velocity_24h > 5 or amount > 50000 or location not in ["India", "IN"]:
        return True
    return False
