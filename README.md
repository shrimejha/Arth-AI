#Avatar Base — AI-Powered Digital Wealth Management System

> **Production-Grade** | **SEBI Compliant** | **DPDP Act 2023 Aligned** | **RBI Data-Localized**

A comprehensive, compliant AI-powered wealth advisory platform integrated into retail banking, serving four major life-cycle segments: Children, Students, Young Employed, and Seniors/Pensioners.

---

## Repository Structure

```
Projects Fin/
├── frontend/                    # Client-side application
│   ├── index.html               # Main Avatar Base Dashboard
│   ├── css/
│   │   └── main.css             # Design system & component styles
│   ├── js/
│   │   ├── app.js               # App bootstrap, routing, theme-sync & goal planner
│   │   ├── whs-engine.js        # Wealth Health Score computation
│   │   ├── tax-optimizer.js     # 80C/80D/NPS/LTCG engine
│   │   ├── portfolio-advisor.js # Drift detection & SEBI compliance
│   │   ├── avatar-engine.js     # Micro-copy card generator
│   │   ├── fraud-sentinel.js    # Velocity rules & anomaly alerts
│   │   └── salary-splitter.js  # Salary-day auto-split algorithm
│   └── pages/
│       ├── children.html        # Gamified goal-jars module
│       ├── student.html         # Career timeline module
│       ├── young-employed.html  # Salary split + ELSS module
│       ├── senior.html          # High-accessibility + fraud banner
│       └── rm-copilot.html      # Augmented relationship manager dashboard
├── backend/                     # Python FastAPI services
│   ├── main.py                  # API entry point & routers
│   ├── requirements.txt         # Core dependencies
│   ├── services/
│   │   ├── wealth_score.py      # WHS diagnostic algorithms
│   │   ├── tax_optimizer.py     # Income tax calculator
│   │   ├── portfolio_advisor.py # Asset drift & suitability checks
│   │   ├── fraud_sentinel.py    # Risk sentinel and MFA rules
│   │   └── avatar_engine.py     # Dynamic NLG advice card builder
│   ├── models/
│   │   └── schemas.py           # Pydantic validation schemas
│   └── database/
│       ├── avatar_base.db       # Initialized SQLite Database
│       ├── schema.sql           # Database schema definition
│       └── seed_data.sql        # Demo seed data for all 4 profiles
├── serve.py                     # Local dev HTTP server (port 8080)
└── README.md                    # System Documentation
```

---

## Quick Start

### 1. Frontend-Only Mock Mode (No Python Setup Needed)
If you just want to run the frontend dashboard instantly using static mock data:
```powershell
# From the project root
python serve.py
# Opens at http://localhost:8080
```

### 2. Full-Stack Mode (Frontend + Python API Server)
For the live experience with real-time database lookups, compliance calculations, and audits:
```powershell
# 1. Install Python dependencies
cd backend
pip install -r requirements.txt

# 2. Start the FastAPI backend (port 8000)
python -m uvicorn main:app --reload --port 8000

# 3. In another terminal, start the frontend server (port 8080)
cd ..
python serve.py
```
*   **Web Dashboard URL:** [http://localhost:8080](http://localhost:8080)
*   **Interactive API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Key Modules & Features

| Module | Highlights & Implementation |
|--------|-----------------------------|
| **Interactive Goal Planner** | Full CRUD capabilities (Add, Edit, and Delete goals) backed by `sessionStorage` and guarded by L1 Step-Up Security confirmation. |
| **Theme Synchronizer** | Dynamic Dark/Light mode toggle that syncs automatically across the main layout and all sub-modules (including the RM Copilot iframe). |
| **Wealth Health Score (WHS)** | 5-Pillar diagnostic index gauge, computed dynamically via backend algorithms and visualized with a rolling 6-Month Trend Sparkline. |
| **Tax Optimizer** | Real-time old vs. new tax slab comparator for Section 80C, 80D, NPS, and senior interest tracking. |
| **Portfolio Advisor** | Asset class drift detection (5% threshold), concentration warnings (>20% single-stock check), and SEBI suitability guards. |
| **RM Copilot panel** | Integrated human advisor workspace highlighting portfolio drifts, unutilized tax limits, and anomaly signals for prompt client handoff. |
| **Fraud Sentinel** | MFA velocity rules, biometric mock checkouts, and device fingerprint validations. |

---

## Compliance Frameworks

- ✅ **DPDP Act 2023 Aligned:** Granular per-category consent checkboxes (Spending, Investments, Tax, Insurance). Consents are verified prior to profiling and can be revoked dynamically.
- ✅ **RBI Data-Localization:** All transaction registries and client vaults are isolated to local instances simulated in local SQLite datasets.
- ✅ **SEBI Advisory Suitability:** Heuristic nudges enforce non-dismissible risk disclosures and run validations against SEBI-registered Research Analyst credentials.
- ✅ **Income Tax Act compliance:** Programmed to compare tax liabilities against standard FY 2025-26 tax slabs (including Section 80TTB benefits for seniors).

---

## 📋 Demo Profiles

Use the following credentials in the login page or select a quick-profile card:

| Username | Password | Persona Segment | Initial Assets | Security Requirement |
|----------|----------|-----------------|----------------|----------------------|
| `arjun` | `password123` | **Young Employed** | ₹8.43 Lakhs | Biometric Fingerprint |
| `meena` | `password123` | **Senior Citizen** | ₹13.50 Lakhs | SMS OTP Code (`1234`) |
| `priya` | `password123` | **Student** | ₹45,000 | Biometric Fingerprint |
| `rahul` | `password123` | **Child (Minor)** | ₹3,500 | SMS OTP Code (`1234`) |

---

*Disclaimer: Avatar Base is an automated wealth advisor simulation. All investments are subject to market risks. Past performance is not indicative of future returns.*
