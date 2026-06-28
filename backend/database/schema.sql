-- ============================================================
-- AI-Powered Digital Wealth Management System (Avatar Base)
-- SQLite Database Schema Definition
-- ============================================================

-- Users & Identity Table
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bank_customer_id TEXT NOT NULL UNIQUE,
    pan_token TEXT NOT NULL UNIQUE,
    aadhaar_ref TEXT UNIQUE,
    mobile_hash TEXT NOT NULL,
    dob TEXT NOT NULL,
    lifecycle_segment TEXT NOT NULL, -- 'CHILD' | 'STUDENT' | 'YOUNG_EMPLOYED' | 'SENIOR'
    preferred_lang TEXT NOT NULL DEFAULT 'en',
    kyc_status TEXT NOT NULL DEFAULT 'PENDING',
    risk_profile TEXT, -- 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'GROWTH'
    risk_profile_last_updated TEXT,
    is_parent_linked BOOLEAN DEFAULT 0,
    parent_user_id TEXT,
    wealth_health_score INTEGER,
    whs_last_computed TEXT,
    avatar_name TEXT,
    onboarding_complete BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(parent_user_id) REFERENCES users(user_id)
);

-- Consent Management (DPDP Act Aligned)
CREATE TABLE IF NOT EXISTS consent_records (
    consent_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    data_category TEXT NOT NULL, -- 'SPENDING_ANALYSIS'|'INVESTMENT_DATA'|'TAX_PROFILING'|'INSURANCE_DATA'
    purpose TEXT NOT NULL,
    purpose_code TEXT NOT NULL,
    consent_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING'|'GRANTED'|'REVOKED'|'EXPIRED'
    consent_version TEXT NOT NULL,
    granted_at TEXT,
    expires_at TEXT,
    revoked_at TEXT,
    revocation_reason TEXT,
    consent_artifact_url TEXT,
    ip_address TEXT,
    device_fingerprint TEXT,
    channel TEXT,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

-- Transactions & Behavioral Data
CREATE TABLE IF NOT EXISTS transactions (
    txn_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    bank_txn_ref TEXT NOT NULL UNIQUE,
    txn_type TEXT NOT NULL, -- 'UPI_DEBIT'|'UPI_CREDIT'|'NEFT'|'IMPS'|'ATM'|'POS'|'EMI'|'SIP'
    amount_paise INTEGER NOT NULL,
    direction TEXT NOT NULL, -- 'D' or 'C'
    merchant_name TEXT,
    merchant_mcc TEXT,
    merchant_vpa TEXT,
    spend_category TEXT, -- 'FOOD'|'TRANSPORT'|'EMI'|'INVESTMENT'|'UTILITY'|'ENTERTAINMENT'|'SHOPPING'|'SALARY'
    spend_subcategory TEXT,
    is_recurring BOOLEAN DEFAULT 0,
    txn_timestamp TEXT NOT NULL,
    value_date TEXT NOT NULL,
    running_balance_paise INTEGER,
    metadata TEXT, -- JSON format
    behavioral_flags TEXT, -- JSON format
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

-- Investment Portfolio & Holdings
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    holding_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    instrument_type TEXT NOT NULL, -- 'EQUITY'|'MF_EQUITY'|'MF_DEBT'|'ETF'|'BOND'|'FD'|'PPF'|'NPS'|'GOLD'
    isin TEXT,
    scheme_code TEXT,
    instrument_name TEXT NOT NULL,
    folio_account_token TEXT,
    units_or_quantity REAL NOT NULL,
    avg_cost_price_paise INTEGER NOT NULL,
    current_nav_paise INTEGER,
    current_value_paise INTEGER,
    unrealized_gain_paise INTEGER,
    gain_pct REAL,
    purchase_date TEXT,
    maturity_date TEXT,
    lock_in_end_date TEXT,
    sector TEXT,
    sub_category TEXT,
    asset_class TEXT, -- 'EQUITY'|'DEBT'|'GOLD'|'CASH'
    target_allocation_bps INTEGER,
    data_source TEXT NOT NULL, -- 'CAMS'|'KFINTECH'|'NSDL'|'CDSL'|'MANUAL'
    last_synced_at TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

-- Capital Gains Ledger
CREATE TABLE IF NOT EXISTS capital_gains_ledger (
    cg_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    fiscal_year TEXT NOT NULL, -- e.g., '2025-26'
    isin_or_scheme TEXT NOT NULL,
    instrument_name TEXT,
    gain_type TEXT NOT NULL, -- 'STCG'|'LTCG'
    gain_amount_paise INTEGER NOT NULL,
    tax_applicable_rate_bps INTEGER,
    estimated_tax_paise INTEGER,
    sale_date TEXT NOT NULL,
    purchase_date TEXT NOT NULL,
    is_grandfathered BOOLEAN DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

-- Tax Profile & Deduction Tracker
CREATE TABLE IF NOT EXISTS tax_profiles (
    tax_profile_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    fiscal_year TEXT NOT NULL, -- '2025-26'
    selected_regime TEXT, -- 'OLD'|'NEW'|'UNDECIDED'
    gross_income_paise INTEGER DEFAULT 0,
    elss_invested_paise INTEGER DEFAULT 0,
    ppf_invested_paise INTEGER DEFAULT 0,
    nsc_invested_paise INTEGER DEFAULT 0,
    life_premium_paise INTEGER DEFAULT 0,
    home_loan_principal_paise INTEGER DEFAULT 0,
    epf_contribution_paise INTEGER DEFAULT 0,
    tuition_fees_paise INTEGER DEFAULT 0,
    sec_80c_total_paise INTEGER DEFAULT 0,
    sec_80c_remaining_paise INTEGER DEFAULT 15000000,
    health_premium_self_paise INTEGER DEFAULT 0,
    health_premium_parents_paise INTEGER DEFAULT 0,
    parents_are_senior BOOLEAN DEFAULT 0,
    sec_80d_eligible_paise INTEGER DEFAULT 0,
    nps_additional_paise INTEGER DEFAULT 0,
    hra_received_paise INTEGER DEFAULT 0,
    actual_rent_paise INTEGER DEFAULT 0,
    is_metro_city BOOLEAN DEFAULT 0,
    hra_eligible_paise INTEGER DEFAULT 0,
    fd_interest_earned_paise INTEGER DEFAULT 0,
    sec_80ttb_eligible_paise INTEGER DEFAULT 0,
    total_ltcg_paise INTEGER DEFAULT 0,
    total_stcg_paise INTEGER DEFAULT 0,
    estimated_total_tax_old_paise INTEGER DEFAULT 0,
    estimated_total_tax_new_paise INTEGER DEFAULT 0,
    recommended_regime TEXT,
    regime_savings_paise INTEGER DEFAULT 0,
    last_computed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(user_id),
    UNIQUE (user_id, fiscal_year)
);

-- AI Recommendation Audit Log (SEBI & DPDP Traceability)
CREATE TABLE IF NOT EXISTS ai_recommendation_audit (
    audit_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL, -- 'TAX_80C'|'PORTFOLIO_DRIFT'|'SALARY_SPLIT'|'FRAUD_ALERT'|'WHS_IMPROVEMENT'|'CAPITAL_GAINS'
    recommendation_payload TEXT NOT NULL, -- JSON formatted payload
    input_data_snapshot TEXT NOT NULL, -- JSON formatted snapshot (no direct PII)
    model_version TEXT NOT NULL,
    model_weights_hash TEXT NOT NULL,
    confidence_score REAL,
    sebi_ra_validation_ref TEXT,
    risk_disclosure_shown BOOLEAN NOT NULL DEFAULT 1,
    user_action TEXT, -- 'ACCEPTED'|'DECLINED'|'DEFERRED'|'IGNORED'
    user_action_timestamp TEXT,
    lifecycle_segment TEXT,
    fiscal_year TEXT,
    channel TEXT NOT NULL DEFAULT 'MOBILE_APP',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    entry_hash TEXT,
    prev_entry_hash TEXT,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

-- Fraud & Anomaly Detection Events
CREATE TABLE IF NOT EXISTS fraud_events (
    event_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'VELOCITY_BREACH'|'UNUSUAL_LOCATION'|'DEVICE_MISMATCH'|'BIOMETRIC_ANOMALY'|'PATTERN_DEVIATION'
    severity TEXT NOT NULL, -- 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'
    trigger_txn_id TEXT,
    risk_score REAL NOT NULL,
    features_snapshot TEXT NOT NULL, -- JSON formatted features
    action_taken TEXT, -- 'BLOCKED'|'STEP_UP_AUTH_REQUIRED'|'ALERTED_USER'|'RM_NOTIFIED'
    resolution_status TEXT DEFAULT 'OPEN', -- 'OPEN'|'CONFIRMED_FRAUD'|'FALSE_POSITIVE'|'INVESTIGATING'
    resolved_by TEXT, -- 'USER'|'RM'|'SYSTEM'
    resolved_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(user_id),
    FOREIGN KEY(trigger_txn_id) REFERENCES transactions(txn_id)
);
