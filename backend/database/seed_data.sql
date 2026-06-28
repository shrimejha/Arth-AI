-- ============================================================
-- Seed Data for SQLite Database (Avatar Base System)
-- ============================================================

-- 1. INSERT DEMO USERS
-- Arjun Sharma (Young Employed)
INSERT OR REPLACE INTO users (
    user_id, name, bank_customer_id, pan_token, aadhaar_ref, mobile_hash, dob,
    lifecycle_segment, preferred_lang, kyc_status, risk_profile, is_parent_linked, parent_user_id,
    wealth_health_score, whs_last_computed, avatar_name, onboarding_complete, is_active
) VALUES (
    '11111111-1111-1111-1111-111111111111', 'Arjun Sharma', 'CIF-100201',
    'PAN_HMAC_ARJUN_123', 'UIDAI_REF_ARJUN_89', 'MOB_HASH_ARJUN_55', '1995-08-15',
    'YOUNG_EMPLOYED', 'en', 'VERIFIED', 'MODERATE', 0, NULL,
    85, '2026-06-25 10:00:00', 'Arya', 1, 1
);

-- Meena Devi (Senior Citizen)
INSERT OR REPLACE INTO users (
    user_id, name, bank_customer_id, pan_token, aadhaar_ref, mobile_hash, dob,
    lifecycle_segment, preferred_lang, kyc_status, risk_profile, is_parent_linked, parent_user_id,
    wealth_health_score, whs_last_computed, avatar_name, onboarding_complete, is_active
) VALUES (
    '22222222-2222-2222-2222-222222222222', 'Meena Devi', 'CIF-334510',
    'PAN_HMAC_MEENA_987', 'UIDAI_REF_MEENA_02', 'MOB_HASH_MEENA_66', '1961-04-12',
    'SENIOR', 'hi', 'VERIFIED', 'CONSERVATIVE', 0, NULL,
    90, '2026-06-25 10:00:00', 'Sahaya', 1, 1
);

-- Priya Iyer (Student)
INSERT OR REPLACE INTO users (
    user_id, name, bank_customer_id, pan_token, aadhaar_ref, mobile_hash, dob,
    lifecycle_segment, preferred_lang, kyc_status, risk_profile, is_parent_linked, parent_user_id,
    wealth_health_score, whs_last_computed, avatar_name, onboarding_complete, is_active
) VALUES (
    '33333333-3333-3333-3333-333333333333', 'Priya Iyer', 'CIF-887102',
    'PAN_HMAC_PRIYA_456', 'UIDAI_REF_PRIYA_37', 'MOB_HASH_PRIYA_77', '2005-11-20',
    'STUDENT', 'ta', 'VERIFIED', 'AGGRESSIVE', 0, NULL,
    72, '2026-06-25 10:00:00', 'Nova', 1, 1
);

-- Rahul (Child - linked to parent Arjun Sharma)
INSERT OR REPLACE INTO users (
    user_id, name, bank_customer_id, pan_token, aadhaar_ref, mobile_hash, dob,
    lifecycle_segment, preferred_lang, kyc_status, risk_profile, is_parent_linked, parent_user_id,
    wealth_health_score, whs_last_computed, avatar_name, onboarding_complete, is_active
) VALUES (
    '44444444-4444-4444-4444-444444444444', 'Rahul (Minor)', 'CIF-990112',
    'PAN_HMAC_RAHUL_777', NULL, 'MOB_HASH_RAHUL_99', '2014-06-10',
    'CHILD', 'en', 'PENDING', 'CONSERVATIVE', 1, '11111111-1111-1111-1111-111111111111',
    95, '2026-06-25 10:00:00', 'Buddy', 1, 1
);


-- 2. INSERT DPDP CONSENT RECORDS
-- Arjun Sharma Consents
INSERT OR REPLACE INTO consent_records (consent_id, user_id, data_category, purpose, purpose_code, consent_status, consent_version, granted_at, expires_at, channel) VALUES
('con-arjun-01', '11111111-1111-1111-1111-111111111111', 'SPENDING_ANALYSIS', 'Analyzing UPI & Debit Card transactions for budgeting', 'PURP_BUDGET_ANALYSIS', 'GRANTED', 'v1.0', '2026-01-01 09:00:00', '2027-01-01 09:00:00', 'MOBILE_APP'),
('con-arjun-02', '11111111-1111-1111-1111-111111111111', 'INVESTMENT_DATA', 'Syncing portfolio details for drift detection & advisory', 'PURP_PORTFOLIO_ADVISORY', 'GRANTED', 'v1.0', '2026-01-01 09:00:00', '2027-01-01 09:00:00', 'MOBILE_APP'),
('con-arjun-03', '11111111-1111-1111-1111-111111111111', 'TAX_PROFILING', 'Calculating tax deductions and regime recommendations', 'PURP_TAX_OPTIMIZATION', 'GRANTED', 'v1.0', '2026-01-01 09:00:00', '2027-01-01 09:00:00', 'MOBILE_APP'),
('con-arjun-04', '11111111-1111-1111-1111-111111111111', 'INSURANCE_DATA', 'Assessing life and health insurance coverage gaps', 'PURP_INSURANCE_GAP', 'GRANTED', 'v1.0', '2026-01-01 09:00:00', '2027-01-01 09:00:00', 'MOBILE_APP');

-- Meena Devi Consents
INSERT OR REPLACE INTO consent_records (consent_id, user_id, data_category, purpose, purpose_code, consent_status, consent_version, granted_at, expires_at, channel) VALUES
('con-meena-01', '22222222-2222-2222-2222-222222222222', 'SPENDING_ANALYSIS', 'Monitoring transaction patterns for safety and fraud prevention', 'PURP_FRAUD_MONITORING', 'GRANTED', 'v1.0', '2026-01-01 10:00:00', '2027-01-01 10:00:00', 'MOBILE_APP'),
('con-meena-02', '22222222-2222-2222-2222-222222222222', 'TAX_PROFILING', 'Tracking 80TTB interest limits and senior benefits', 'PURP_TAX_OPTIMIZATION', 'GRANTED', 'v1.0', '2026-01-01 10:00:00', '2027-01-01 10:00:00', 'MOBILE_APP');

-- Priya Iyer Consents
INSERT OR REPLACE INTO consent_records (consent_id, user_id, data_category, purpose, purpose_code, consent_status, consent_version, granted_at, expires_at, channel) VALUES
('con-priya-01', '33333333-3333-3333-3333-333333333333', 'SPENDING_ANALYSIS', 'Analyzing pocket money/income for career goal planning', 'PURP_BUDGET_ANALYSIS', 'GRANTED', 'v1.0', '2026-02-15 11:30:00', '2027-02-15 11:30:00', 'MOBILE_APP'),
('con-priya-02', '33333333-3333-3333-3333-333333333333', 'INVESTMENT_DATA', 'Providing portfolio advice on micro-saving SIPs', 'PURP_PORTFOLIO_ADVISORY', 'GRANTED', 'v1.0', '2026-02-15 11:30:00', '2027-02-15 11:30:00', 'MOBILE_APP');


-- 3. INSERT RECENT TRANSACTIONS
-- Arjun Sharma (Salary + SIPs + Discretionary Spends)
INSERT OR REPLACE INTO transactions (txn_id, user_id, bank_txn_ref, txn_type, amount_paise, direction, merchant_name, merchant_mcc, spend_category, txn_timestamp, value_date) VALUES
('tx-arjun-01', '11111111-1111-1111-1111-111111111111', 'REF-992019', 'NEFT', 8500000, 'C', 'INDO TECH CORP SALARY', '6012', 'SALARY', '2026-06-01 09:00:00', '2026-06-01'),
('tx-arjun-02', '11111111-1111-1111-1111-111111111111', 'REF-992020', 'SIP', 500000, 'D', 'HDFC PRUDENTIAL TAX ELSS', '6012', 'INVESTMENT', '2026-06-02 10:00:00', '2026-06-02'),
('tx-arjun-03', '11111111-1111-1111-1111-111111111111', 'REF-992021', 'SIP', 300000, 'D', 'SBI NIFTY 50 INDEX FUND', '6012', 'INVESTMENT', '2026-06-02 10:05:00', '2026-06-02'),
('tx-arjun-04', '11111111-1111-1111-1111-111111111111', 'REF-992022', 'EMI', 1500000, 'D', 'ICICI HFL HOME LOAN', '6012', 'EMI', '2026-06-05 06:00:00', '2026-06-05'),
('tx-arjun-05', '11111111-1111-1111-1111-111111111111', 'REF-992023', 'UPI_DEBIT', 125000, 'D', 'ZOMATO ONLINE DELIV', '5812', 'FOOD', '2026-06-25 21:00:00', '2026-06-25'),
('tx-arjun-06', '11111111-1111-1111-1111-111111111111', 'REF-992024', 'UPI_DEBIT', 45000, 'D', 'UBER INDIA TRANSPORT', '5541', 'TRANSPORT', '2026-06-26 09:30:00', '2026-06-26'),
('tx-arjun-07', '11111111-1111-1111-1111-111111111111', 'REF-992025', 'UPI_DEBIT', 350000, 'D', 'RELIANCE DIGITAL APPL', '5999', 'SHOPPING', '2026-06-26 14:00:00', '2026-06-26');

-- Meena Devi (Pension + FDs + Utility)
INSERT OR REPLACE INTO transactions (txn_id, user_id, bank_txn_ref, txn_type, amount_paise, direction, merchant_name, merchant_mcc, spend_category, txn_timestamp, value_date) VALUES
('tx-meena-01', '22222222-2222-2222-2222-222222222222', 'REF-887102', 'IMPS', 3500000, 'C', 'GOVT OF INDIA PENSION', '6012', 'SALARY', '2026-06-01 08:00:00', '2026-06-01'),
('tx-meena-02', '22222222-2222-2222-2222-222222222222', 'REF-887103', 'UPI_DEBIT', 150000, 'D', 'APOLLO PHARMACY CHEMS', '5912', 'HEALTH', '2026-06-05 11:00:00', '2026-06-05'),
('tx-meena-03', '22222222-2222-2222-2222-222222222222', 'REF-887104', 'NEFT', 200000, 'D', 'BESCOM POWER SUPPLY', '4900', 'UTILITY', '2026-06-10 10:00:00', '2026-06-10');


-- 4. INSERT PORTFOLIO HOLDINGS
-- Arjun Sharma (Moderate risk: 65% Equity, 25% Debt, 10% Gold/Cash. Drift created by Reliance stock overweight)
INSERT OR REPLACE INTO portfolio_holdings (holding_id, user_id, instrument_type, isin, scheme_code, instrument_name, units_or_quantity, avg_cost_price_paise, current_nav_paise, current_value_paise, unrealized_gain_paise, gain_pct, asset_class, target_allocation_bps, data_source, last_synced_at) VALUES
('h-arjun-01', '11111111-1111-1111-1111-111111111111', 'MF_EQUITY', 'INF200K01135', '119062', 'SBI Bluechip Fund Direct-Growth', 523.456, 12000, 15500, 8113568, 1832096, 29.16, 'EQUITY', 4000, 'CAMS', '2026-06-25 17:00:00'),
('h-arjun-02', '11111111-1111-1111-1111-111111111111', 'MF_DEBT', 'INF179KB1235', '120503', 'HDFC Short Term Debt Fund-Growth', 2050.112, 2200, 2450, 5022774, 512528, 11.36, 'DEBT', 2500, 'CAMS', '2026-06-25 17:00:00'),
('h-arjun-03', '11111111-1111-1111-1111-111111111111', 'EQUITY', 'INE002A01018', NULL, 'Reliance Industries Ltd.', 250.00, 210000, 245000, 61250000, 8750000, 16.66, 'EQUITY', 1500, 'NSDL', '2026-06-25 17:00:00'), -- Overweight: causing single stock concentration (>20% of total 80L portfolio)
('h-arjun-04', '11111111-1111-1111-1111-111111111111', 'GOLD', 'INF204KB1882', '118223', 'Nippon India ETF Gold BeES', 80.00, 5200, 6100, 488000, 72000, 17.30, 'GOLD', 1000, 'CDSL', '2026-06-25 17:00:00'),
('h-arjun-05', '11111111-1111-1111-1111-111111111111', 'EQUITY', 'INE154A01025', NULL, 'Tata Motors Ltd. (With Loss)', 100.00, 120000, 95000, 9500000, -2500000, -20.83, 'EQUITY', 1000, 'NSDL', '2026-06-25 17:00:00'); -- Unrealized loss: prime candidate for tax-loss harvesting

-- Meena Devi (Conservative: Fixed Deposits + PPF)
INSERT OR REPLACE INTO portfolio_holdings (holding_id, user_id, instrument_type, isin, scheme_code, instrument_name, units_or_quantity, avg_cost_price_paise, current_nav_paise, current_value_paise, unrealized_gain_paise, gain_pct, asset_class, target_allocation_bps, data_source, last_synced_at) VALUES
('h-meena-01', '22222222-2222-2222-2222-222222222222', 'FD', NULL, NULL, 'SBI 1-Yr Fixed Deposit @ 7.1%', 1, 100000000, 100000000, 100000000, 0, 0.00, 'DEBT', 8000, 'MANUAL', '2026-06-25 17:00:00'),
('h-meena-02', '22222222-2222-2222-2222-222222222222', 'PPF', NULL, NULL, 'Post Office PPF Account', 1, 35000000, 35000000, 35000000, 0, 0.00, 'DEBT', 2000, 'MANUAL', '2026-06-25 17:00:00');


-- 5. INSERT TAX PROFILES (FY 2025-26)
-- Arjun Sharma
INSERT OR REPLACE INTO tax_profiles (
    tax_profile_id, user_id, fiscal_year, selected_regime, gross_income_paise,
    elss_invested_paise, ppf_invested_paise, nsc_invested_paise, life_premium_paise, home_loan_principal_paise, epf_contribution_paise, tuition_fees_paise,
    health_premium_self_paise, health_premium_parents_paise, parents_are_senior, sec_80d_eligible_paise,
    nps_additional_paise, hra_received_paise, actual_rent_paise, is_metro_city, hra_eligible_paise,
    fd_interest_earned_paise, total_ltcg_paise, total_stcg_paise,
    estimated_total_tax_old_paise, estimated_total_tax_new_paise, recommended_regime, regime_savings_paise, last_computed_at
) VALUES (
    'tax-arjun-01', '11111111-1111-1111-1111-111111111111', '2025-26', 'UNDECIDED', 102000000, -- ₹10.2L
    5000000, 1500000, 0, 1000000, 3000000, 0, 0, -- 80C: 50k + 15k + 10k + 30k = 105k
    1500000, 0, 0, 1500000, -- 80D: 15k self
    0, 12000000, 18000000, 0, 6000000, -- HRA: Rent ₹1.8L, HRA ₹1.2L -> Eligible ₹60k
    0, 20000000, 5000000, -- Capital Gains: LTCG ₹2L, STCG ₹50k
    12844000, 7250000, 'NEW', 5594000, '2026-06-25 18:00:00'
);

-- Meena Devi
INSERT OR REPLACE INTO tax_profiles (
    tax_profile_id, user_id, fiscal_year, selected_regime, gross_income_paise,
    elss_invested_paise, ppf_invested_paise, nsc_invested_paise, life_premium_paise, home_loan_principal_paise, epf_contribution_paise, tuition_fees_paise,
    health_premium_self_paise, health_premium_parents_paise, parents_are_senior, sec_80d_eligible_paise,
    nps_additional_paise, hra_received_paise, actual_rent_paise, is_metro_city, hra_eligible_paise,
    fd_interest_earned_paise, total_ltcg_paise, total_stcg_paise,
    estimated_total_tax_old_paise, estimated_total_tax_new_paise, recommended_regime, regime_savings_paise, last_computed_at
) VALUES (
    'tax-meena-01', '22222222-2222-2222-2222-222222222222', '2025-26', 'NEW', 42000000, -- ₹4.2L pension
    0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0, 0,
    2200000, 0, 0, -- FD Interest: ₹22k
    468000, 0, 'NEW', 468000, '2026-06-25 18:00:00'
);
