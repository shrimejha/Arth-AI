/**
 * Avatar Base — Tax Optimization Engine (Frontend)
 * Section 80C / 80D / NPS / LTCG / Old-vs-New Regime
 * Finance Act 2025 (FY 2025-26) aligned
 */

// ── Constants ────────────────────────────────────────────────────────
const SEC_80C_CEILING = 150000;    // ₹1.5L in rupees
const NPS_80CCD1B_CEILING = 50000; // ₹50K additional

// New Regime Slabs FY 2025-26
const NEW_REGIME_SLABS = [
  [400000, 0.00], [800000, 0.05], [1200000, 0.10],
  [1600000, 0.15], [2000000, 0.20], [2400000, 0.25],
  [Infinity, 0.30]
];

// Old Regime Slabs (below 60)
const OLD_REGIME_SLABS = [
  [250000, 0.00], [500000, 0.05], [1000000, 0.20], [Infinity, 0.30]
];

// Old Regime Slabs (Senior 60-80)
const OLD_REGIME_SLABS_SENIOR = [
  [300000, 0.00], [500000, 0.05], [1000000, 0.20], [Infinity, 0.30]
];

const CESS_RATE = 0.04;
const HEALTH_ED_CESS = 0.04;

// ── Utility ──────────────────────────────────────────────────────────
function computeSlabTax(income, slabs) {
  let tax = 0;
  let prev = 0;
  for (const [limit, rate] of slabs) {
    if (income <= prev) break;
    const taxable = Math.min(income, limit) - prev;
    tax += taxable * rate;
    prev = limit;
  }
  return Math.round(tax);
}

function applySurcharge(income, tax, isNewRegime = false) {
  let rate = 0;
  if (income > 50000000) rate = 0.37;       // >5Cr
  else if (income > 20000000) rate = 0.25;  // >2Cr
  else if (income > 10000000) rate = 0.15;  // >1Cr
  else if (income > 5000000) rate = 0.10;   // >50L
  if (isNewRegime) rate = Math.min(rate, 0.25);
  return Math.round(tax * rate);
}

// ── Section 80C Optimizer ─────────────────────────────────────────────
export function compute80CAnalysis({
  elssInvested = 0, ppfInvested = 0, nscInvested = 0,
  lifePremium = 0, homeLoanPrincipal = 0, epfContribution = 0,
  tuitionFees = 0, monthsRemaining = 12
}) {
  const total = elssInvested + ppfInvested + nscInvested +
                lifePremium + homeLoanPrincipal + epfContribution + tuitionFees;
  const utilized = Math.min(total, SEC_80C_CEILING);
  const remaining = Math.max(SEC_80C_CEILING - utilized, 0);

  const urgency = monthsRemaining <= 1 ? 'CRITICAL' :
                  monthsRemaining <= 3 ? 'HIGH' :
                  monthsRemaining <= 6 ? 'MEDIUM' : 'LOW';

  const urgencyColors = {
    CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#10b981', NONE: '#94a3b8'
  };

  const recommendations = remaining > 0 ? [
    {
      code: 'ELSS', name: 'ELSS Mutual Fund', amount: Math.round(remaining * 0.6),
      lockIn: '3 years', cagr: '12%', risk: 'HIGH', liquidity: 4,
      taxMaturity: 'LTCG applicable above ₹1L',
      rationale: `Market-linked returns with shortest lock-in. Flexible SIP mode available.`,
    },
    {
      code: 'PPF', name: 'Public Provident Fund', amount: Math.round(remaining * 0.3),
      lockIn: '15 years', cagr: '7.1%', risk: 'LOW', liquidity: 1,
      taxMaturity: 'Fully exempt (EEE)',
      rationale: 'Government-backed, fully tax-exempt on maturity. Ideal for long-term wealth.',
    },
    {
      code: 'NSC', name: 'National Savings Certificate', amount: Math.round(remaining * 0.1),
      lockIn: '5 years', cagr: '7.7%', risk: 'LOW', liquidity: 2,
      taxMaturity: 'Taxable as income',
      rationale: 'Fixed guaranteed returns. Interest is also 80C eligible.',
    },
  ] : [];

  return {
    utilized, remaining, utilizationPct: Math.round(utilized / SEC_80C_CEILING * 100),
    urgency, urgencyColor: urgencyColors[urgency],
    breakdown: { elssInvested, ppfInvested, nscInvested, lifePremium, homeLoanPrincipal, epfContribution, tuitionFees },
    recommendations,
    monthlyTarget: monthsRemaining > 0 ? Math.round(remaining / monthsRemaining) : remaining,
  };
}

// ── 80D Health Insurance Analysis ────────────────────────────────────
export function compute80DAnalysis({ selfPremium, parentPremium, parentsAreSenior, isSeniorAssessee }) {
  const selfLimit = isSeniorAssessee ? 50000 : 25000;
  const parentLimit = parentsAreSenior ? 50000 : 25000;
  const selfEligible = Math.min(selfPremium, selfLimit);
  const parentEligible = Math.min(parentPremium, parentLimit);
  const totalEligible = selfEligible + parentEligible;
  const selfGap = selfLimit - selfEligible;
  const parentGap = parentLimit - parentEligible;
  return {
    selfEligible, parentEligible, totalEligible,
    selfLimit, parentLimit,
    selfGap, parentGap, totalGap: selfGap + parentGap,
  };
}

// ── Capital Gains Analysis ────────────────────────────────────────────
const LTCG_EQUITY_EXEMPTION = 100000;
const LTCG_RATE = 0.125;     // 12.5% post Budget 2024
const STCG_RATE = 0.20;      // 20% post Budget 2024

export function analyzeCapitalGains({ realizedLTCG = 0, realizedSTCG = 0, realizedLTCL = 0, realizedSTCL = 0, holdings = [], today = new Date() }) {
  const fyEnd = new Date(today.getFullYear(), 2, 31); // March 31
  const daysToFYEnd = Math.max(0, Math.round((fyEnd - today) / (1000 * 60 * 60 * 24)));

  const netLTCG = Math.max(realizedLTCG - realizedLTCL, 0);
  const netSTCG = Math.max(realizedSTCG - realizedSTCL, 0);

  const ltcgAfterExemption = Math.max(netLTCG - LTCG_EQUITY_EXEMPTION, 0);
  const ltcgTax = Math.round(ltcgAfterExemption * LTCG_RATE);
  const stcgTax = Math.round(netSTCG * STCG_RATE);
  const totalTax = ltcgTax + stcgTax;

  // Harvest candidates
  const candidates = holdings
    .filter(h => (h.unrealizedGain || 0) < 0)
    .map(h => {
      const loss = Math.abs(h.unrealizedGain || 0);
      const daysHeld = h.daysHeld || 365;
      const type = daysHeld > 365 ? 'LTCG' : 'STCG';
      const saving = type === 'LTCG'
        ? Math.round(Math.min(loss, netLTCG) * LTCG_RATE)
        : Math.round(Math.min(loss, netSTCG) * STCG_RATE);
      return {
        name: h.name, loss, saving, type, daysHeld,
        rationale: `Booking ₹${fmt(loss)} loss saves ~₹${fmt(saving)} in ${type} tax before March 31.`
      };
    })
    .filter(c => c.saving > 0)
    .sort((a, b) => b.saving - a.saving)
    .slice(0, 5);

  const urgencyMsg = daysToFYEnd <= 7
    ? `🔴 CRITICAL: Only ${daysToFYEnd} days to March 31!`
    : daysToFYEnd <= 30
    ? `🟡 ${daysToFYEnd} days remaining to financial year-end`
    : `🟢 ${daysToFYEnd} days — plan your harvesting strategy`;

  return {
    netLTCG, netSTCG, ltcgAfterExemption,
    ltcgExemption: Math.min(netLTCG, LTCG_EQUITY_EXEMPTION),
    ltcgTax, stcgTax, totalTax,
    candidates,
    totalHarvestSaving: candidates.reduce((s, c) => s + c.saving, 0),
    daysToFYEnd, urgencyMsg,
  };
}

// ── Old vs. New Regime Comparator ────────────────────────────────────
export function compareRegimes({
  grossIncome, isSenior = false,
  sec80c = 0, sec80d = 0, nps80ccd1b = 0,
  hraEligible = 0, homeLoanInterest = 0,
  sec80ttb = 0, otherDeductions = 0,
}) {
  // -- Old Regime --
  const stdDeductionOld = 50000;
  const totalDeductionsOld = stdDeductionOld + sec80c + sec80d + nps80ccd1b + hraEligible + homeLoanInterest + sec80ttb + otherDeductions;
  const taxableOld = Math.max(grossIncome - totalDeductionsOld, 0);
  const slabsOld = isSenior ? OLD_REGIME_SLABS_SENIOR : OLD_REGIME_SLABS;
  const taxOld = computeSlabTax(taxableOld, slabsOld);
  const surchargeOld = applySurcharge(taxableOld, taxOld, false);
  const beforeCessOld = taxOld + surchargeOld;
  const rebate87aOld = taxableOld <= 500000 ? Math.min(beforeCessOld, 12500) : 0;
  const afterRebateOld = Math.max(beforeCessOld - rebate87aOld, 0);
  const totalTaxOld = Math.round(afterRebateOld * (1 + CESS_RATE));
  const effectiveRateOld = grossIncome > 0 ? (totalTaxOld / grossIncome * 100) : 0;

  // -- New Regime --
  const stdDeductionNew = 75000;
  const taxableNew = Math.max(grossIncome - stdDeductionNew, 0);
  const taxNew = computeSlabTax(taxableNew, NEW_REGIME_SLABS);
  const surchargeNew = applySurcharge(taxableNew, taxNew, true);
  const beforeCessNew = taxNew + surchargeNew;
  const rebate87aNew = taxableNew <= 700000 ? beforeCessNew : 0;
  const afterRebateNew = Math.max(beforeCessNew - rebate87aNew, 0);
  const totalTaxNew = Math.round(afterRebateNew * (1 + CESS_RATE));
  const effectiveRateNew = grossIncome > 0 ? (totalTaxNew / grossIncome * 100) : 0;

  // -- Verdict --
  const recommended = totalTaxOld < totalTaxNew ? 'OLD' : 'NEW';
  const savings = Math.abs(totalTaxOld - totalTaxNew);
  const verdict = recommended === 'OLD'
    ? `Old regime saves ₹${fmt(savings)}/year. Maximize your deductions (80C, 80D, NPS) to widen this advantage.`
    : `New regime saves ₹${fmt(savings)}/year. Your current deductions aren't enough to beat the lower slabs.`;

  return {
    old: { totalDeductions: totalDeductionsOld, taxableIncome: taxableOld, tax: totalTaxOld, effectiveRate: effectiveRateOld.toFixed(2), rebate: rebate87aOld },
    new: { taxableIncome: taxableNew, tax: totalTaxNew, effectiveRate: effectiveRateNew.toFixed(2), rebate: rebate87aNew },
    recommended, savings, verdict,
  };
}

// ── Salary-Day Auto-Split ─────────────────────────────────────────────
export function computeSalarySplit({
  netSalary, currentEF, monthlyExpenses,
  sec80cRemaining, npsRemaining, goals = [],
  monthsRemainingInFY = 6
}) {
  let remaining = netSalary;

  // Step 1: Emergency Fund
  const efTarget = monthlyExpenses * 6;
  const efShortfall = Math.max(efTarget - currentEF, 0);
  const efContrib = Math.min(efShortfall, Math.round(netSalary * 0.20));
  remaining -= efContrib;

  // Step 2: Goal SIPs
  const goalSIPs = goals.map(g => {
    const monthsLeft = g.monthsToTarget || 24;
    const needed = Math.max((g.targetAmount || 0) - (g.currentAmount || 0), 0);
    if (needed <= 0 || monthsLeft <= 0) return { ...g, sip: 0 };
    const r = 0.12 / 12;
    const sip = needed * r / (Math.pow(1 + r, monthsLeft) - 1);
    return { ...g, sip: Math.round(Math.min(sip, remaining * 0.15)) };
  });
  const totalGoalSIP = goalSIPs.reduce((s, g) => s + g.sip, 0);
  remaining -= totalGoalSIP;

  // Step 3: ELSS (80C)
  const monthly80C = monthsRemainingInFY > 0 ? Math.round(sec80cRemaining / monthsRemainingInFY) : sec80cRemaining;
  const elssSIP = Math.min(monthly80C, Math.round(remaining * 0.15));
  remaining -= elssSIP;

  // Step 4: NPS (80CCD1B)
  const monthlyNPS = monthsRemainingInFY > 0 ? Math.round(npsRemaining / monthsRemainingInFY) : npsRemaining;
  const npsContrib = Math.min(monthlyNPS, Math.round(remaining * 0.10));
  remaining -= npsContrib;

  // Tax saving estimate (30% bracket assumption)
  const taxSaving = Math.round((elssSIP + npsContrib) * 0.30);
  const freeSpend = Math.max(remaining, 0);
  const utilization = ((netSalary - freeSpend) / netSalary * 100).toFixed(1);

  return {
    netSalary, efContrib, efShortfall, efTarget,
    goalSIPs, totalGoalSIP, elssSIP, npsContrib,
    freeSpend, taxSaving, utilization,
    segments: [
      { label: 'Emergency Fund', amount: efContrib, pct: efContrib / netSalary, color: '#3b82f6' },
      { label: 'Goal SIPs',      amount: totalGoalSIP, pct: totalGoalSIP / netSalary, color: '#10b981' },
      { label: 'ELSS Tax Saver', amount: elssSIP, pct: elssSIP / netSalary, color: '#6366f1' },
      { label: 'NPS',            amount: npsContrib, pct: npsContrib / netSalary, color: '#f59e0b' },
      { label: 'Free Spend',     amount: freeSpend, pct: freeSpend / netSalary, color: '#475569' },
    ]
  };
}

function fmt(val) {
  return Number(val).toLocaleString('en-IN');
}

export { fmt };
