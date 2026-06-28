from pydantic import BaseModel
from typing import List, Dict, Optional

class UserSegment(BaseModel):
    user_id: str
    segment: str
    age: int

class WealthHealthScoreRequest(BaseModel):
    user_id: str
    income: float
    savings: float
    investments: float
    debt: float
    current_savings_balance: Optional[float] = 0.0
    has_life_insurance: Optional[bool] = False
    life_cover: Optional[float] = 0.0
    has_health_insurance: Optional[bool] = False
    health_cover: Optional[float] = 0.0
    family_size: Optional[int] = 1
    active_sip_monthly: Optional[float] = 0.0
    sip_missed_last_6m: Optional[int] = 0
    portfolio_drift_pct: Optional[float] = 0.0
    emi_monthly: Optional[float] = 0.0
    credit_card_utilization_pct: Optional[float] = 0.0

class TaxOptimizationRequest(BaseModel):
    user_id: str
    income: float
    age: int
    investments_80c: float
    health_insurance_80d: float
    nps_80ccd1b: Optional[float] = 0.0
    hra_eligible: Optional[float] = 0.0
    home_loan_interest: Optional[float] = 0.0
    sec_80ttb: Optional[float] = 0.0
    other_deductions: Optional[float] = 0.0

class PortfolioDriftRequest(BaseModel):
    user_id: str
    current_allocation: Dict[str, float]
    target_allocation: Dict[str, float]
    holdings: Optional[List[Dict]] = []

class FraudDetectionRequest(BaseModel):
    user_id: str
    transaction_amount: float
    is_new_beneficiary: Optional[bool] = False
    device_hash: Optional[str] = ""
    avg_dwell_ms: Optional[float] = 120.0
    
class ConsentUpdateRequest(BaseModel):
    user_id: str
    data_category: str
    consent_status: str # 'GRANTED' or 'REVOKED'
    reason: Optional[str] = None

class StepUpAuthRequest(BaseModel):
    user_id: str
    action: str
    auth_level_required: int
    otp_code: str
    biometric_matched: bool

class LoginRequest(BaseModel):
    username: str
    password: str
