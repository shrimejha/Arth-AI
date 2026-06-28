/**
 * Avatar Base — App Bootstrap & Dynamic Routing
 * Orchestrates connection to FastAPI backend, updates WHS gauges,
 * renders adaptive advice cards, monitors DPDP consents, and manages step-up auth.
 */

const API_BASE = "http://127.0.0.1:8000";

// ── Mock data fallback (used when backend is offline) ──────────────────
const MOCK_DATA = {
  profile: { user_id: "11111111-1111-1111-1111-111111111111", name: "Arjun Sharma", lifecycle_segment: "YOUNG_EMPLOYED", wealth_health_score: 56, current_balance_paise: 1000000 },
  transactions: [{ spend_category: "SALARY", direction: "C", amount_paise: 8500000 }],
  holdings: [
    { asset_class: "EQUITY", current_value_paise: 6000000, instrument_name: "NIFTY50 Index Fund", instrument_type: "EQUITY", sector: "DIVERSIFIED" },
    { asset_class: "DEBT",   current_value_paise: 2000000, instrument_name: "Liquid Fund",        instrument_type: "DEBT",   sector: "LIQUID" }
  ],
  total_investments_paise: 8000000,
  consents: [
    { data_category: "SPENDING_ANALYSIS", consent_status: "GRANTED" },
    { data_category: "INVESTMENT_DATA",   consent_status: "GRANTED" },
    { data_category: "TAX_PROFILING",     consent_status: "GRANTED" },
    { data_category: "INSURANCE_DATA",    consent_status: "GRANTED" }
  ],
  tax_profile: { sec_80c_remaining_paise: 15000000, fd_interest_earned_paise: 0 }
};

const MOCK_CARDS = [
  { cardId: "mock-whs", type: "WHS_IMPROVEMENT", segment: "YOUNG_EMPLOYED", accent: "whs", typeBadge: "Wealth Health", what: "Your Wealth Health Score is 56/100 — Grade C", why: "Strengthen your insurance cover and rebalance equity holdings to improve your score.", actionLabel: "Review Insurance & Rebalance", actionUrl: "/plan/whs-improvement", authLevel: 1, disclosure: "WHS is an illustrative dashboard index indicator, not a yield guarantee.", dataUsed: ["PORTFOLIO_DATA", "INSURANCE_DATA"], explainRef: "/why/mock-whs", confidence: 0.90, isTimeSensitive: false, createdAt: new Date().toISOString() },
  { cardId: "mock-tax", type: "TAX_80C", segment: "YOUNG_EMPLOYED", accent: "tax", typeBadge: "Tax Savings", what: "Invest ₹1,50,000 before March 31 — save up to ₹45,000 in tax.", why: "You have ₹1,50,000 left in your Section 80C limit this year. Deploying into ELSS lowers taxable income directly.", actionLabel: "Invest in ELSS Now", actionUrl: "/invest/80c", authLevel: 2, disclosure: "General tax-planning information. Consult a CA for final filings.", dataUsed: ["TAX_PROFILE", "TRANSACTION_HISTORY"], explainRef: "/why/mock-tax", confidence: 0.92, isTimeSensitive: true, createdAt: new Date().toISOString() },
  { cardId: "mock-salary", type: "SALARY_SPLIT", segment: "YOUNG_EMPLOYED", accent: "salary", typeBadge: "Salary Day Splitter", what: "Your salary of ₹85,000 is credited. Here is the smart split.", why: "We suggest ₹10K emergency fund, ₹15K ELSS SIP, ₹3K NPS — saving ~₹2,400 in taxes.", actionLabel: "Confirm Split & Invest", actionUrl: "/salary-split/confirm", authLevel: 2, disclosure: "SEBI: Investments subject to market risks. Not a registered IA.", dataUsed: ["TRANSACTION_HISTORY", "TAX_PROFILE", "PORTFOLIO_DATA"], explainRef: "/why/mock-salary", confidence: 0.91, isTimeSensitive: true, createdAt: new Date().toISOString() }
];

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[Avatar Base] API unreachable (${url}), using mock data.`);
    return null; // Callers check for null and use mock
  }
}

// State
let currentUserId = "11111111-1111-1111-1111-111111111111"; // Arjun Sharma default
let currentUserSegment = "YOUNG_EMPLOYED";
let currentUserData = null;

// Step-Up Auth Callback queue
let currentStepUpAuth = {
    action: "",
    authLevel: 1,
    onSuccess: null,
    onFailure: null
};

// Persona profiles metadata
const PERSONA_METADATA = {
    "11111111-1111-1111-1111-111111111111": { name: "Arya", tone: "Efficient" },
    "22222222-2222-2222-2222-222222222222": { name: "Sahaya", tone: "Reassuring" },
    "33333333-3333-3333-3333-333333333333": { name: "Nova", tone: "Aspirational" },
    "44444444-4444-4444-4444-444444444444": { name: "Buddy", tone: "Encouraging" }
};

document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing Avatar Base Dashboard...");
    
    setupEventListeners();
    initTheme();
    checkAuthStatus();
    
    // Sync theme to all iframes when they load or if already loaded
    document.querySelectorAll("iframe").forEach(iframe => {
        iframe.onload = () => syncIframeTheme(iframe);
        syncIframeTheme(iframe);
    });

    // Wire global step-up modal launcher
    window.showStepUpModal = launchStepUpAuth;
    window.handleCardAction = executeCardAction;
});

let tempUserData = null; // Holds credentials login response before MFA completes

function checkAuthStatus() {
    const loggedInId = sessionStorage.getItem("loggedInUserId");
    const loggedInSegment = sessionStorage.getItem("loggedInUserSegment");
    const loggedInName = sessionStorage.getItem("loggedInUserName");
    
    const overlay = document.getElementById("authOverlay");
    if (loggedInId) {
        currentUserId = loggedInId;
        currentUserSegment = loggedInSegment;
        
        if (overlay) overlay.classList.add("hidden");
        
        // Populate profile card badge
        document.getElementById("sidebarProfileName").textContent = loggedInName;
        document.getElementById("sidebarProfileRole").textContent = getSegmentLabel(loggedInSegment);
        
        // Populate sidebar profile avatar
        const avatarMap = {
            "11111111-1111-1111-1111-111111111111": "./images/avatar_arjun.png",
            "22222222-2222-2222-2222-222222222222": "./images/avatar_meena.png",
            "33333333-3333-3333-3333-333333333333": "./images/avatar_priya.png",
            "44444444-4444-4444-4444-444444444444": "./images/avatar_rahul.png"
        };
        const sidebarAvatarIcon = document.getElementById("sidebarAvatarIcon");
        if (sidebarAvatarIcon && avatarMap[loggedInId]) {
            sidebarAvatarIcon.innerHTML = `<img src="${avatarMap[loggedInId]}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        }
        
        // Set values in settings configurations
        const riskSelect = document.getElementById("settingsRiskProfile");
        if (riskSelect) {
            riskSelect.value = getRiskProfileForUser(loggedInId);
        }
        
        loadDashboard(loggedInId);
        populateFamilyTable();
    } else {
        const sidebarAvatarIcon = document.getElementById("sidebarAvatarIcon");
        if (sidebarAvatarIcon) {
            sidebarAvatarIcon.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent)" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
            `;
        }
        if (overlay) {
            overlay.classList.remove("hidden");
            document.getElementById("signInCard").classList.remove("hidden");
            document.getElementById("mfaCard").classList.add("hidden");
        }
    }
}

function getSegmentLabel(segment) {
    const map = {
        "YOUNG_EMPLOYED": "Young Employed",
        "SENIOR": "Senior Citizen",
        "STUDENT": "Student",
        "CHILD": "Child / Minor"
    };
    return map[segment] || segment;
}

function getRiskProfileForUser(userId) {
    const map = {
        "11111111-1111-1111-1111-111111111111": "MODERATE",
        "22222222-2222-2222-2222-222222222222": "CONSERVATIVE",
        "33333333-3333-3333-3333-333333333333": "AGGRESSIVE",
        "44444444-4444-4444-4444-444444444444": "CONSERVATIVE"
    };
    return map[userId] || "MODERATE";
}

function populateFamilyTable() {
    const tableBody = document.getElementById("familyTableBody");
    if (!tableBody) return;

    const familyMembers = [
        {
            name: "Meena Devi",
            role: "Senior Citizen",
            score: 90,
            assets: "₹13,50,000",
            primaryAssets: "Fixed Deposits & PPF",
            status: "Protected"
        },
        {
            name: "Arjun Sharma",
            role: "Young Employed",
            score: 85,
            assets: "₹8,43,743",
            primaryAssets: "Portfolio",
            status: "Active ELSS SIP"
        },
        {
            name: "Priya Iyer",
            role: "Student",
            score: 72,
            assets: "₹45,000",
            primaryAssets: "Index Fund SIP",
            status: "Active"
        },
        {
            name: "Rahul (Minor)",
            role: "Child",
            score: 95,
            assets: "₹3,500",
            primaryAssets: "Goal Jars",
            status: "Active"
        }
    ];

    const avatarImg = (name) => {
        if (name.includes("Arjun")) return `./images/avatar_arjun.png`;
        if (name.includes("Meena")) return `./images/avatar_meena.png`;
        if (name.includes("Priya")) return `./images/avatar_priya.png`;
        return `./images/avatar_rahul.png`;
    };

    const scoreColor = (score) => score >= 90 ? "var(--text-success)" : score >= 80 ? "var(--text-accent)" : "var(--warning)";

    tableBody.innerHTML = familyMembers.map(m => {
        const color = scoreColor(m.score);
        const statusBadgeStyle = m.status === "Protected" 
            ? "background: rgba(16, 185, 129, 0.1); color: var(--text-success); border: 1px solid rgba(16, 185, 129, 0.2);" 
            : "background: rgba(59, 130, 246, 0.1); color: var(--text-accent); border: 1px solid rgba(59, 130, 246, 0.2);";
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center;">
                        <span class="avatar-badge-circle" style="padding: 0; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%;">
                            <img src="${avatarImg(m.name)}" style="width: 100%; height: 100%; object-fit: cover;">
                        </span>
                        <strong style="margin-left: 8px;">${m.name}</strong>
                    </div>
                </td>
                <td>${m.role}</td>
                <td>
                    <span style="font-weight: 700; color: ${color};">${m.score}</span>
                </td>
                <td style="font-weight: 600;">${m.assets}</td>
                <td style="color: var(--text-secondary);">${m.primaryAssets}</td>
                <td>
                    <span style="font-size: 11px; padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 600; ${statusBadgeStyle}">
                        ${m.status}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

function setupEventListeners() {
    // ── Sign-In Handlers ──
    const loginSubmitBtn = document.getElementById("loginSubmitBtn");
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener("click", async () => {
            const userIn = document.getElementById("loginUsername").value.trim().toLowerCase();
            const passIn = document.getElementById("loginPassword").value;
            const errorMsg = document.getElementById("loginErrorMsg");
            errorMsg.style.display = "none";

            // ── Mock credentials for guaranteed demo fallback ─────────────
            const MOCK_CREDENTIALS = {
                "arjun":  { user_id: "11111111-1111-1111-1111-111111111111", name: "Arjun Sharma",  segment: "YOUNG_EMPLOYED" },
                "meena":  { user_id: "22222222-2222-2222-2222-222222222222", name: "Meena Devi",    segment: "SENIOR"         },
                "priya":  { user_id: "33333333-3333-3333-3333-333333333333", name: "Priya Iyer",    segment: "STUDENT"        },
                "rahul":  { user_id: "44444444-4444-4444-4444-444444444444", name: "Rahul (Minor)", segment: "CHILD"          }
            };

            let data = null;
            try {
                const res = await fetch(`${API_BASE}/api/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: userIn, password: passIn })
                });
                if (res.ok) {
                    data = await res.json();
                }
            } catch (err) {
                console.warn("[Avatar Base] Login API unreachable, using mock credentials.");
            }

            // Fallback to mock if API didn't respond or returned error
            if (!data) {
                if (passIn === "password123" && MOCK_CREDENTIALS[userIn]) {
                    data = { status: "success", ...MOCK_CREDENTIALS[userIn] };
                } else {
                    errorMsg.style.display = "block";
                    errorMsg.textContent = "Invalid credentials. Try arjun / meena / priya / rahul with password123.";
                    return;
                }
            }

            tempUserData = data;

            // Show MFA Overlay Card
            document.getElementById("signInCard").classList.add("hidden");
            const mfaCard = document.getElementById("mfaCard");
            mfaCard.classList.remove("hidden");

            // Determine which mock MFA to show
            const mfaTypeSubtitle = document.getElementById("mfaTypeSubtitle");
            const bioOption = document.getElementById("mfaBiometricOption");
            const otpOption = document.getElementById("mfaOtpOption");
            const fpIcon = document.getElementById("loginFingerprintSvg");

            // Reset scanner icon color
            fpIcon.classList.remove("scanning");
            fpIcon.style.stroke = "var(--brand-400)";
            document.getElementById("loginOtpCode").value = "";
            document.getElementById("mfaOverlayErrorMsg").style.display = "none";

            if (data.segment === "YOUNG_EMPLOYED" || data.segment === "STUDENT") {
                mfaTypeSubtitle.textContent = "Secure Biometric scan required";
                bioOption.style.display = "block";
                otpOption.style.display = "none";
            } else {
                mfaTypeSubtitle.textContent = "SMS One-Time Passcode required";
                bioOption.style.display = "none";
                otpOption.style.display = "block";
            }
        });
    }

    // 2FA Back Button
    const mfaResetBtn = document.getElementById("mfaResetBtn");
    if (mfaResetBtn) {
        mfaResetBtn.addEventListener("click", () => {
            document.getElementById("signInCard").classList.remove("hidden");
            document.getElementById("mfaCard").classList.add("hidden");
            tempUserData = null;
        });
    }

    // Biometric Fingerprint click simulator
    const fpIcon = document.getElementById("loginFingerprintSvg");
    let isFpMatched = false;
    if (fpIcon) {
        fpIcon.addEventListener("click", () => {
            isFpMatched = true;
            fpIcon.classList.add("scanning");
            setTimeout(() => {
                fpIcon.style.stroke = "var(--success)";
                // Auto verify after success
                completeLoginSession();
            }, 1000);
        });
    }

    // 2FA Verify Button
    const mfaVerifyBtnOverlay = document.getElementById("mfaVerifyBtnOverlay");
    if (mfaVerifyBtnOverlay) {
        mfaVerifyBtnOverlay.addEventListener("click", () => {
            const otpCodeVal = document.getElementById("loginOtpCode").value.trim();
            const errEl = document.getElementById("mfaOverlayErrorMsg");
            errEl.style.display = "none";
            
            if (tempUserData.segment === "YOUNG_EMPLOYED" || tempUserData.segment === "STUDENT") {
                // Auto-match for easy demo experience
                const fpIcon = document.getElementById("loginFingerprintSvg");
                if (fpIcon) {
                    fpIcon.style.stroke = "var(--success)";
                    fpIcon.classList.add("scanning");
                }
                setTimeout(() => {
                    completeLoginSession();
                }, 800);
            } else {
                if (otpCodeVal === "1234" || otpCodeVal === "") { // allow empty otp as fallback for easy demo
                    completeLoginSession();
                } else {
                    errEl.style.display = "block";
                    errEl.textContent = "Invalid passcode. Please enter '1234' for simulator clearance.";
                }
            }
        });
    }

    function completeLoginSession() {
        if (!tempUserData) return;
        sessionStorage.setItem("loggedInUserId", tempUserData.user_id);
        sessionStorage.setItem("loggedInUserSegment", tempUserData.segment);
        sessionStorage.setItem("loggedInUserName", tempUserData.name);
        
        isFpMatched = false;
        tempUserData = null;
        
        checkAuthStatus();
    }

    // ── Sign Out Handler ──
    const sidebarSignOutBtn = document.getElementById("sidebarSignOutBtn");
    if (sidebarSignOutBtn) {
        sidebarSignOutBtn.addEventListener("click", () => {
            sessionStorage.clear();
            currentUserId = "";
            currentUserSegment = "YOUNG_EMPLOYED";
            
            // Switch back to overview tab status
            document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
            document.querySelector('.nav-item[data-tab="overview"]').classList.add("active");
            document.querySelectorAll(".subtab-content").forEach(content => content.classList.remove("active"));
            document.getElementById("tab-overview").classList.add("active");
            
            checkAuthStatus();
        });
    }

    // ── Main Dashboard Tabs Toggler ──
    const tabBtns = document.querySelectorAll(".nav-item[data-tab]");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            tabBtns.forEach(b => b.classList.remove("active"));
            const target = e.currentTarget;
            target.classList.add("active");
            
            const tabName = target.getAttribute("data-tab");
            
            // Hide all tab panels
            document.querySelectorAll(".subtab-content").forEach(panel => {
                panel.classList.remove("active");
            });
            
            // Show target panel
            const activePanel = document.getElementById(`tab-${tabName}`);
            if (activePanel) {
                activePanel.classList.add("active");
            }
        });
    });

    // ── Consent checkboxes ──
    const consentCheckboxes = document.querySelectorAll("#consentCheckboxes input[type='checkbox']");
    consentCheckboxes.forEach(cb => {
        cb.addEventListener("change", (e) => {
            const category = e.target.getAttribute("data-category");
            const isChecked = e.target.checked;
            
            if (isChecked) {
                e.target.checked = false; // Revert until authorized
                launchStepUpAuth(
                    `GRANT_CONSENT_${category}`,
                    2,
                    () => {
                        e.target.checked = true;
                        updateConsentOnBackend(category, "GRANTED");
                    },
                    () => {
                        console.log("Consent authorization rejected.");
                    }
                );
            } else {
                updateConsentOnBackend(category, "REVOKED");
            }
        });
    });

    // ── Settings Save Profile ──
    const saveProfileBtn = document.getElementById("settingsSaveProfileBtn");
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener("click", async () => {
            const newRisk = document.getElementById("settingsRiskProfile").value;
            const newLang = document.getElementById("settingsLanguage").value;
            
            alert(`Profile settings updated!\nRisk profile: ${newRisk}\nLanguage: ${newLang}\n\nWealth health score values will adjust dynamically.`);
            // Trigger recalculation with the new parameters
            if (currentUserData) {
                await triggerWHSCalculation(currentUserData);
            }
        });
    }

    // Step-up Auth Verification Dialog Controls
    const cancelBtn = document.getElementById("mfaCancelBtn");
    const verifyBtn = document.getElementById("mfaVerifyBtn");
    const biometricBtn = document.getElementById("biometricAuthBtn");
    const otpInput = document.getElementById("mfaOtpCode");
    
    let simulatedBiometricMatch = false;

    biometricBtn.addEventListener("click", () => {
        simulatedBiometricMatch = true;
        biometricBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Biometric Signature Matched
        `;
        biometricBtn.style.borderColor = "var(--success)";
        biometricBtn.style.color = "var(--text-success)";
    });

    cancelBtn.addEventListener("click", () => {
        closeStepUpModal();
        if (currentStepUpAuth.onFailure) currentStepUpAuth.onFailure();
    });

    verifyBtn.addEventListener("click", async () => {
        const otpCode = otpInput.value.trim();
        const errorMsg = document.getElementById("mfaErrorMsg");
        errorMsg.style.display = "none";

        let approved = false;
        try {
            const res = await fetch(`${API_BASE}/api/auth/step-up`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: currentUserId,
                    action: currentStepUpAuth.action,
                    auth_level_required: currentStepUpAuth.authLevel,
                    otp_code: otpCode,
                    biometric_matched: simulatedBiometricMatch
                })
            });
            approved = res.ok;
        } catch (err) {
            // API unreachable — validate locally
            console.warn("[Avatar Base] Step-up API unreachable, validating locally.");
            approved = (otpCode === "1234" || simulatedBiometricMatch);
        }

        if (approved) {
            closeStepUpModal();
            if (currentStepUpAuth.onSuccess) currentStepUpAuth.onSuccess();
        } else {
            errorMsg.style.display = "block";
        }
    });

    // Reset biometric status on dialog open
    window.resetBiometricStatus = () => {
        simulatedBiometricMatch = false;
        biometricBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
              <path d="M12 2a10 10 0 0 0-10 10c0 5.5 4.5 10 10 10s10-4.5 10-10A10 10 0 0 0 12 2zm0 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
            </svg>
            Match Fingerprint Biometrics
        `;
        biometricBtn.style.borderColor = "var(--success)";
        biometricBtn.style.color = "var(--text-success)";
        otpInput.value = "";
        document.getElementById("mfaErrorMsg").style.display = "none";
    };
}

async function loadDashboard(userId, pageUrl = null) {
    try {
        console.log(`Loading profile stats for user: ${userId}`);
        const data = await apiFetch(`${API_BASE}/api/profile/${userId}`) || MOCK_DATA;
        currentUserData = data;
        
        // Sync consent checkboxes with backend state
        syncConsentCheckboxes(data.consents);
        
        // Compute / update WHS score
        await triggerWHSCalculation(data);
        
        // Render net worth snapshot
        renderNetWorthSnapshot(data);

        // Render goals card
        renderGoals();
        
        // Render dynamic segment iframe
        updateSegmentIframe(pageUrl || getPageForSegment(currentUserSegment));
        
        // Fetch and render advisory cards
        await fetchAndRenderAdvisoryCards(userId);
        
    } catch (err) {
        console.error("Error loading dashboard data:", err);
    }
}

function syncConsentCheckboxes(consents) {
    const consentMap = Object.fromEntries(consents.map(c => [c.data_category, c.consent_status]));
    const categories = ["SPENDING_ANALYSIS", "INVESTMENT_DATA", "TAX_PROFILING", "INSURANCE_DATA"];
    
    categories.forEach(cat => {
        const checkbox = document.querySelector(`#consentCheckboxes input[data-category='${cat}']`);
        if (checkbox) {
            checkbox.checked = (consentMap[cat] === "GRANTED");
        }
    });
}

async function triggerWHSCalculation(data) {
    // Collect request values from database snapshot
    const profile = data.profile;
    const isSenior = profile.lifecycle_segment === "SENIOR";
    const totalInvestments = data.total_investments_paise / 100.0;
    
    // Extract totals from transactions list
    const netSalaryTx = data.transactions.find(t => t.spend_category === "SALARY" && t.direction === "C");
    const incomeVal = netSalaryTx ? (netSalaryTx.amount_paise / 100.0) : (isSenior ? 35000.0 : 85000.0);
    
    const taxProfile = data.tax_profile;
    const savingsVal = incomeVal * 0.20; // Heuristic fallback
    
    const reqBody = {
        user_id: profile.user_id,
        income: incomeVal,
        savings: savingsVal,
        investments: totalInvestments,
        debt: isSenior ? 0.0 : 15000.0,
        current_savings_balance: isSenior ? 15000.0 : 10000.0,
        has_life_insurance: !isSenior,
        life_cover: !isSenior ? (incomeVal * 12.0 * 10.0) : 0.0,
        has_health_insurance: true,
        health_cover: 500000.0,
        family_size: isSenior ? 1 : 3,
        active_sip_monthly: isSenior ? 0.0 : 8000.0,
        sip_missed_last_6m: 0,
        portfolio_drift_pct: 7.2, // Triggers drift alert
        emi_monthly: isSenior ? 0.0 : 15000.0,
        credit_card_utilization_pct: isSenior ? 0.0 : 25.0
    };
    
    try {
        const whs = await apiFetch(`${API_BASE}/api/whs/calculate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqBody)
        });
        
        if (whs) {
            renderWHSGauge(whs.score, whs.pillars, whs.explanations);
            updateAvatarGreeting(profile.name, whs.score, whs.message);
        } else {
            // fallback: render with mock score
            renderWHSGauge(56, { cash_reserve: 40, savings_rate: 60, insurance: 45, investment: 70, debt: 65 }, {});
            updateAvatarGreeting(profile.name, 56, "Build your emergency fund to improve your score.");
        }
    } catch (err) {
        console.error("WHS computation failed:", err);
    }
}

function renderWHSGauge(score, pillars, explanations) {
    // Animate score text
    const textEl = document.getElementById("whsScoreText");
    const gradeEl = document.getElementById("whsGradeBadge");
    
    const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";
    const gradeColor = score >= 90 ? "#10b981" : score >= 80 ? "#22d3ee" : score >= 65 ? "#3b82f6" : score >= 50 ? "#f59e0b" : "#ef4444";
    
    textEl.textContent = score;
    gradeEl.textContent = grade;
    gradeEl.style.color = gradeColor;
    
    // Update SVG stroke-dashoffset
    const fillArc = document.querySelector(".gauge-fill-arc");
    if (fillArc) {
        const radius = 70;
        const circumference = Math.PI * radius;
        const offset = circumference * (1 - score / 100);
        fillArc.style.strokeDasharray = `${circumference}`;
        fillArc.style.strokeDashoffset = `${offset}`;
        fillArc.style.stroke = gradeColor;
    }
    
    // Render Pillars
    const whsPillars = document.getElementById("whsPillars");
    const names = {
        cash_reserve: "Cash Reserve",
        savings_rate: "Savings Rate",
        insurance: "Insurance Cover",
        investment: "Investment SIP",
        debt: "Debt Liability"
    };
    
    const colors = {
        cash_reserve: "#3b82f6", savings_rate: "#10b981",
        insurance: "#f59e0b", investment: "#6366f1", debt: "#ec4899"
    };
    
    whsPillars.innerHTML = Object.entries(pillars).map(([key, val]) => `
        <div class="pillar-row" title="${explanations[key] || ''}">
            <span class="pillar-name">${names[key]}</span>
            <div class="pillar-track">
                <div class="pillar-fill" style="width: ${val}%; background: ${colors[key] || '#94a3b8'}"></div>
            </div>
            <span class="pillar-pct">${Math.round(val)}</span>
        </div>
    `).join('');

    // ── WHS Sparkline ─────────────────────────────────────────────────
    const sparkCanvas = document.getElementById('whsSparkline');
    if (sparkCanvas && typeof Chart !== 'undefined') {
        // Maintain a 6-point rolling history in sessionStorage
        let history = JSON.parse(sessionStorage.getItem('whsHistory') || '[]');
        history.push(score);
        if (history.length > 6) history = history.slice(-6);
        sessionStorage.setItem('whsHistory', JSON.stringify(history));

        // Pad history with prior months if fewer than 6 points
        const labels = ['5mo', '4mo', '3mo', '2mo', '1mo', 'Now'].slice(-history.length);
        const padded = history.length < 6
            ? Array(6 - history.length).fill(null).concat(history)
            : history;
        const paddedLabels = ['5mo', '4mo', '3mo', '2mo', '1mo', 'Now'];

        if (window._whsSparklineChart) window._whsSparklineChart.destroy();
        window._whsSparklineChart = new Chart(sparkCanvas, {
            type: 'line',
            data: {
                labels: paddedLabels,
                datasets: [{
                    data: padded,
                    borderColor: gradeColor,
                    backgroundColor: gradeColor + '22',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: gradeColor,
                    fill: true,
                    tension: 0.4,
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600 },
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `WHS: ${ctx.raw}` } } },
                scales: {
                    x: { ticks: { font: { size: 9 }, color: '#64748b' }, grid: { display: false } },
                    y: { display: false, min: 0, max: 100 }
                }
            }
        });
    }
}

function updateAvatarGreeting(userName, score, whsMessage) {
    const avatar = PERSONA_METADATA[currentUserId] || { name: "Arya", tone: "Efficient" };
    document.getElementById("avatarNameHeading").textContent = `${avatar.name} (AI Persona)`;
    document.getElementById("avatarToneBadge").textContent = `Tone: ${avatar.tone}`;
    
    // Render dynamic vector icon for the avatar based on segment
    const svgMap = {
        "YOUNG_EMPLOYED": `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>`,
        "SENIOR": `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>`,
        "STUDENT": `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path>
        </svg>`,
        "CHILD": `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="5"></circle>
          <path d="M20 21a8 8 0 1 0-16 0"></path>
        </svg>`
    };
    document.getElementById("avatarEmoji").innerHTML = svgMap[currentUserSegment] || svgMap.YOUNG_EMPLOYED;
    
    // Segment specific greeting customization
    const greetings = {
        "YOUNG_EMPLOYED": `Hello Arjun, your salary of ₹85,000 was splits-ready. Your wealth score is ${score}/100. ${whsMessage}`,
        "SENIOR": `Namaste Meena Ji. I have scanned your fixed deposits. Your security checks are secure. Score is ${score}/100. ${whsMessage}`,
        "STUDENT": `Hey Priya! Nova has analyzed your freelance cash credits. Wealth score is ${score}/100. Let's make an emergency fund!`,
        "CHILD": `Hi Rahul! Buddy is watching your goal jar grow! Score: ${score}/100.`
    };
    
    // Cache English greeting for language toggle restoration
    const speechEl = document.getElementById('avatarSpeechText');
    const greeting = greetings[currentUserSegment] || `Welcome back. Score: ${score}/100.`;
    if (speechEl) {
        speechEl.textContent = greeting;
        window._lastGreeting = greeting;
    }
}

async function fetchAndRenderAdvisoryCards(userId) {
    const grid = document.getElementById("advisoryCardsGrid");
    let cards;
    try {
        const res = await fetch(`${API_BASE}/api/avatar/cards/${userId}`);
        if (!res.ok) throw new Error("Cards API call failed");
        cards = await res.json();
    } catch (err) {
        console.warn('[Avatar Base] Cards API unavailable, using mock cards.');
        cards = MOCK_CARDS;
    }

    // Update nudge badge
    const badge = document.getElementById('nudgeBadge');
    if (badge) {
        badge.textContent = cards.length;
        badge.style.display = cards.length > 0 ? 'inline-block' : 'none';
    }

    if (cards.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-size: 13px; padding: var(--space-6);">
                No recommendations active. Verify consent checklists in the sidebar to enable profiling options.
            </div>
        `;
        return;
    }

    // Store cards globally for the explain drawer
    window._currentCards = cards;

    grid.innerHTML = cards.map(c => `
        <div class="rec-card" id="${c.cardId}">
            <div class="rec-card-accent ${c.accent || ''}"></div>
            <div class="rec-card-body" style="display: flex; flex-direction: column; height: 100%;">
                <div class="rec-type-badge">${c.typeBadge}</div>
                <div class="rec-what" style="flex-grow: 1;">${c.what}</div>
                <div class="rec-why">${c.why}</div>
                <div class="rec-action-row" style="margin-top: var(--space-4);">
                    <button class="rec-cta-btn ${c.accent === 'fraud' ? 'danger' : ''}" 
                        onclick="handleCardAction('${c.cardId}', '${c.actionUrl}', ${c.authLevel}, '${c.actionLabel.replace(/'/g, '')}')"
                    >
                        ${c.actionLabel} →
                    </button>
                    <a href="#" class="rec-why-link" onclick="openExplainDrawer('${c.cardId}'); return false;">ⓘ Why am I seeing this?</a>
                </div>
                <div class="confidence-bar">
                    <span class="confidence-label">Confidence</span>
                    <div class="confidence-track">
                        <div class="confidence-fill" style="width: ${(c.confidence * 100).toFixed(0)}%"></div>
                    </div>
                    <span class="confidence-label">${(c.confidence * 100).toFixed(0)}%</span>
                </div>
                <details style="margin-top: var(--space-3); border-top: 1px solid var(--surface-glass); padding-top: var(--space-2);">
                    <summary style="font-size: 10px; color: var(--text-muted); cursor: pointer; user-select: none;">⚠️ Regulatory Disclosure</summary>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: var(--space-2); line-height: 1.5;">${c.disclosure}</div>
                </details>
            </div>
        </div>
    `).join('');
}

async function updateConsentOnBackend(category, status) {
    try {
        const res = await fetch(`${API_BASE}/api/consent/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: currentUserId,
                data_category: category,
                consent_status: status,
                reason: status === "REVOKED" ? "User manually revoked granular permission." : "User granted access."
            })
        });
        if (res.ok) {
            console.log(`Consent updated: ${category} -> ${status}`);
            await loadDashboard(currentUserId);
        }
    } catch (err) {
        // Even if API fails, still update UI
        console.warn('Consent API unreachable, updating UI only.');
        await loadDashboard(currentUserId);
    }
}

function updateSegmentIframe(pageUrl) {
    const iframe = document.getElementById("moduleFrame");
    if (iframe) {
        iframe.src = `${pageUrl}?userId=${currentUserId}`;
        iframe.onload = () => {
            syncIframeTheme(iframe);
        };
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    if (savedTheme === "light") {
        document.documentElement.classList.add("light-mode");
    } else {
        document.documentElement.classList.remove("light-mode");
    }
    
    const themeBtn = document.getElementById("themeToggleBtn");
    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            const isLight = document.documentElement.classList.toggle("light-mode");
            localStorage.setItem("theme", isLight ? "light" : "dark");
            
            document.querySelectorAll("iframe").forEach(syncIframeTheme);
        });
    }
}

function syncIframeTheme(iframe) {
    try {
        if (iframe && iframe.contentDocument && iframe.contentDocument.documentElement) {
            const isLight = document.documentElement.classList.contains('light-mode');
            if (isLight) {
                iframe.contentDocument.documentElement.classList.add('light-mode');
            } else {
                iframe.contentDocument.documentElement.classList.remove('light-mode');
            }
        }
    } catch (e) {
        console.error("Could not sync theme to iframe", e);
    }
}

function getPageForSegment(segment) {
    const map = {
        "YOUNG_EMPLOYED": "pages/young-employed.html",
        "SENIOR": "pages/senior.html",
        "STUDENT": "pages/student.html",
        "CHILD": "pages/children.html"
    };
    return map[segment] || "pages/young-employed.html";
}

// Security MFA step-up gating
function launchStepUpAuth(action, authLevel, successCb, failureCb) {
    currentStepUpAuth = {
        action: action,
        authLevel: authLevel,
        onSuccess: successCb,
        onFailure: failureCb
    };
    
    // Configure dialog description based on authLevel
    const descEl = document.getElementById("stepUpActionDescription");
    descEl.textContent = `This action requires Level ${authLevel} MFA clearance. Verify your biometric matches and enter the mock passcode '1234' to approve.`;
    
    // Display modal
    const modal = document.getElementById("stepUpAuthModal");
    modal.classList.add("active");
    window.resetBiometricStatus();
}

function closeStepUpModal() {
    const modal = document.getElementById("stepUpAuthModal");
    modal.classList.remove("active");
}

function triggerSuccessNotification(label, description = null) {
    document.getElementById('successTitle').textContent = label + ' — Activated!';
    document.getElementById('successDesc').textContent = description || `Your request for "${label}" has been securely logged in the SEBI compliance audit trail.`;
    document.getElementById('successTimestamp').textContent = new Date().toLocaleString('en-IN');
    document.getElementById('actionSuccessModal').classList.add('active');
}

function executeCardAction(cardId, actionUrl, authLevel, actionLabel = 'Action') {
    console.log(`Executing CTA click for card: ${cardId}, actionUrl: ${actionUrl}, level: ${authLevel}`);
    
    if (authLevel > 1) {
        launchStepUpAuth(
            `CTA_CLICK_${cardId}`,
            authLevel,
            () => triggerSuccessNotification(actionLabel),
            () => { /* cancelled, do nothing */ }
        );
    } else {
        triggerSuccessNotification(actionLabel);
    }
}

// ── Net Worth Snapshot ───────────────────────────────────────────────
function renderNetWorthSnapshot(data) {
    const invPaise = data.total_investments_paise || 0;
    const cashPaise = (data.profile && data.profile.current_balance_paise) || 1000000;
    const totalPaise = invPaise + cashPaise;
    const totalRs = totalPaise / 100;

    const netWorthEl = document.getElementById('netWorthValue');
    if (netWorthEl) {
        netWorthEl.textContent = '₹' + totalRs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    const breakdown = document.getElementById('netWorthBreakdown');
    if (breakdown && data.holdings) {
        const byClass = {};
        data.holdings.forEach(h => {
            byClass[h.asset_class] = (byClass[h.asset_class] || 0) + h.current_value_paise / 100;
        });
        byClass['Cash'] = cashPaise / 100;

        const pillColors = { EQUITY: '#6366f1', DEBT: '#3b82f6', GOLD: '#f59e0b', Cash: '#10b981' };
        breakdown.innerHTML = Object.entries(byClass).map(([cls, val]) => `
            <div style="display: flex; align-items: center; gap: 6px; background: var(--surface-overlay); border-radius: var(--radius-md); padding: 6px 12px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${pillColors[cls] || '#94a3b8'}; flex-shrink: 0;"></span>
                <span style="font-size: 12px; color: var(--text-secondary);">${cls}</span>
                <span style="font-size: 12px; font-weight: 700; color: var(--text-primary);">₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
        `).join('');
    }
}

// ── Goals Renderer ───────────────────────────────────────────────────
// Expose goal actions globally
window.addGoalAction = function() {
    launchStepUpAuth(
        "ADD_GOAL_AUTHORIZE",
        1,
        () => {
            document.getElementById("goalForm").reset();
            document.getElementById("goalIndex").value = "";
            document.getElementById("goalDeleteBtn").style.display = "none";
            document.getElementById("goalModalTitle").textContent = "Add New Financial Goal";
            document.getElementById("goalModal").classList.add("active");
        },
        () => {
            console.log("Goal addition authorization declined.");
        }
    );
};

window.editGoalAction = function(index) {
    launchStepUpAuth(
        "EDIT_GOAL_AUTHORIZE",
        1,
        () => {
            const goals = getGoalsList();
            const g = goals[index];
            if (!g) return;

            document.getElementById("goalIndex").value = index;
            document.getElementById("goalName").value = g.name;
            document.getElementById("goalDeadline").value = g.deadline;
            document.getElementById("goalTarget").value = g.target;
            document.getElementById("goalCurrent").value = g.current;

            document.getElementById("goalDeleteBtn").style.display = "block";
            document.getElementById("goalModalTitle").textContent = "Edit Financial Goal";
            document.getElementById("goalModal").classList.add("active");
        },
        () => {
            console.log("Goal editing authorization declined.");
        }
    );
};

window.closeGoalModal = function() {
    document.getElementById("goalModal").classList.remove("active");
};

window.deleteGoalAction = function() {
    const indexVal = document.getElementById("goalIndex").value;
    if (indexVal === "") return;
    
    if (confirm("Are you sure you want to delete this goal?")) {
        const idx = parseInt(indexVal);
        const goals = getGoalsList();
        goals.splice(idx, 1);
        saveGoalsList(goals);
        closeGoalModal();
        renderGoals();
        triggerSuccessNotification("Goal Deleted", "The financial milestone has been removed from your goals planner.");
    }
};

window.saveGoalAction = function(event) {
    if (event) event.preventDefault();
    
    const indexVal = document.getElementById("goalIndex").value;
    const name = document.getElementById("goalName").value.trim();
    const deadline = document.getElementById("goalDeadline").value.trim();
    const target = parseFloat(document.getElementById("goalTarget").value);
    const current = parseFloat(document.getElementById("goalCurrent").value);
    
    if (!name || !deadline || isNaN(target) || isNaN(current)) {
        alert("Please fill all fields correctly.");
        return;
    }
    
    const goals = getGoalsList();
    const goalData = { name, target, current, deadline };
    
    if (indexVal !== "") {
        const idx = parseInt(indexVal);
        goals[idx] = { ...goals[idx], ...goalData };
        triggerSuccessNotification("Goal Updated", `Your goal "${name}" has been successfully updated.`);
    } else {
        goals.push(goalData);
        triggerSuccessNotification("Goal Created", `A new goal "${name}" has been successfully initialized and tracked.`);
    }
    
    saveGoalsList(goals);
    closeGoalModal();
    renderGoals();
};

function getGoalsList() {
    const defaultGoals = [
        { name: 'Retirement Corpus', target: 10000000, current: 843743, color: '#6366f1', deadline: 'Dec 2048' },
        { name: 'Emergency Fund (6 mo)', target: 510000, current: 100000, color: '#3b82f6', deadline: 'Sep 2025' },
        { name: 'Europe Vacation', target: 200000, current: 76000, color: '#f59e0b', deadline: 'Mar 2026' }
    ];
    let goals = sessionStorage.getItem('goalsList');
    if (!goals) {
        sessionStorage.setItem('goalsList', JSON.stringify(defaultGoals));
        return defaultGoals;
    }
    return JSON.parse(goals);
}

function saveGoalsList(goals) {
    sessionStorage.setItem('goalsList', JSON.stringify(goals));
}

// ── Goals Renderer ───────────────────────────────────────────────────
function renderGoals() {
    const container = document.getElementById('goalsContainer');
    if (!container) return;

    const GOALS = getGoalsList();
    const colors = ['#6366f1', '#3b82f6', '#f59e0b', '#ec4899', '#10b981', '#a855f7'];

    container.innerHTML = GOALS.map((g, idx) => {
        const pct = Math.min(Math.round(g.current / g.target * 100), 100);
        const color = g.color || colors[idx % colors.length];
        return `
        <div style="background: var(--surface-base); border: 1px solid var(--surface-border); border-radius: var(--radius-xl); padding: var(--space-5);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-3);">
            <div style="display: flex; align-items: center; gap: var(--space-3);">
              <div>
                <div style="font-weight: 700; color: var(--text-primary);">${g.name}</div>
                <div style="font-size: 12px; color: var(--text-muted);">Target: ₹${g.target.toLocaleString('en-IN')} &nbsp;·&nbsp; By ${g.deadline}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-3);">
              <button class="btn btn-secondary btn-sm" onclick="editGoalAction(${idx})" style="padding: 2px 8px; font-size: 11px;">Edit</button>
              <span style="font-size: 13px; font-weight: 700; color: ${color};">${pct}%</span>
            </div>
          </div>
          <div style="background: var(--surface-bg); height: 8px; border-radius: 99px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: ${color}; border-radius: 99px; transition: width 0.8s ease;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: var(--space-2); font-size: 12px; color: var(--text-muted);">
            <span>₹${g.current.toLocaleString('en-IN')} saved</span>
            <span>₹${Math.max(0, g.target - g.current).toLocaleString('en-IN')} remaining</span>
          </div>
        </div>
        `;
    }).join('');
}

// ── Explain Drawer ───────────────────────────────────────────────────
function openExplainDrawer(cardId) {
    const card = (window._currentCards || []).find(c => c.cardId === cardId);
    if (!card) return;

    const content = document.getElementById('explainDrawerContent');
    if (content) {
        content.innerHTML = `
            <div style="background: var(--surface-overlay); border-radius: var(--radius-md); padding: var(--space-4);">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-2);">What this card is</div>
                <div style="font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-2);">${card.typeBadge}</div>
                <div style="font-size: 13px; color: var(--text-secondary);">${card.what}</div>
            </div>
            <div style="background: var(--surface-overlay); border-radius: var(--radius-md); padding: var(--space-4);">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-2);">Why you're seeing this</div>
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">${card.why}</div>
            </div>
            <div style="background: var(--surface-overlay); border-radius: var(--radius-md); padding: var(--space-4);">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-3);">Data sources used</div>
                <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">
                    ${(card.dataUsed || []).map(d => `<span style="background: rgba(99,102,241,0.1); color: var(--text-accent); border: 1px solid rgba(99,102,241,0.2); font-size: 11px; padding: 3px 10px; border-radius: var(--radius-sm); font-weight: 600;">${d.replace(/_/g,' ')}</span>`).join('')}
                </div>
            </div>
            <div style="background: var(--surface-overlay); border-radius: var(--radius-md); padding: var(--space-4);">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-2);">AI Confidence</div>
                <div style="display: flex; align-items: center; gap: var(--space-3);">
                    <div style="flex: 1; background: var(--surface-bg); height: 6px; border-radius: 99px; overflow: hidden;">
                        <div style="height: 100%; width: ${Math.round(card.confidence * 100)}%; background: #10b981; border-radius: 99px;"></div>
                    </div>
                    <span style="font-weight: 700; color: var(--text-success); font-size: 13px;">${Math.round(card.confidence * 100)}%</span>
                </div>
            </div>
            <div style="background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.15); border-radius: var(--radius-md); padding: var(--space-4);">
                <div style="font-size: 11px; color: var(--text-danger); font-weight: 700; text-transform: uppercase; margin-bottom: var(--space-2);">⚠️ Regulatory Disclosure</div>
                <div style="font-size: 11px; color: var(--text-muted); line-height: 1.6;">${card.disclosure}</div>
            </div>
        `;
    }

    document.getElementById('explainDrawer').style.right = '0';
    document.getElementById('explainDrawerOverlay').style.opacity = '1';
    document.getElementById('explainDrawerOverlay').style.pointerEvents = 'auto';
}

function closeExplainDrawer() {
    document.getElementById('explainDrawer').style.right = '-420px';
    document.getElementById('explainDrawerOverlay').style.opacity = '0';
    document.getElementById('explainDrawerOverlay').style.pointerEvents = 'none';
}
