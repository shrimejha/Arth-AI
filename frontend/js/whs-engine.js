/**
 * Avatar Base — Wealth Health Score Engine (Frontend)
 * Computes WHS from user financial data using weighted pillars
 */

const SEGMENT_WEIGHTS = {
  CHILD:          { cash_reserve: 0.20, savings_rate: 0.40, insurance: 0.10, investment: 0.20, debt: 0.10 },
  STUDENT:        { cash_reserve: 0.25, savings_rate: 0.35, insurance: 0.10, investment: 0.20, debt: 0.10 },
  YOUNG_EMPLOYED: { cash_reserve: 0.20, savings_rate: 0.20, insurance: 0.20, investment: 0.25, debt: 0.15 },
  SENIOR:         { cash_reserve: 0.30, savings_rate: 0.15, insurance: 0.25, investment: 0.15, debt: 0.15 },
};

const SAVINGS_BENCHMARKS = {
  CHILD: 0.10, STUDENT: 0.10, YOUNG_EMPLOYED: 0.20, SENIOR: 0.15
};

/**
 * Sigmoid normalization — maps any ratio smoothly to 0-100
 */
function sigmoid100(ratio, steepness = 5, midpoint = 0.5) {
  return 100 / (1 + Math.exp(-steepness * (ratio - midpoint)));
}

function pillarCashReserve({ monthlySavings, monthlyIncome, currentBalance }) {
  const monthlyExpenses = Math.max(monthlyIncome - monthlySavings, 1);
  const target = monthlyExpenses * 6;
  const ratio = currentBalance / target;
  const score = Math.min(sigmoid100(ratio, 5, 0.5), 100);
  const months = ((ratio * 6)).toFixed(1);
  return {
    score,
    explanation: `Emergency fund covers ~${months} months. Target: 6 months (₹${fmt(target)})`,
    monthsOfCover: months,
    target
  };
}

function pillarSavingsRate({ monthlyIncome, monthlySavings, sipMissedLast6m, segment }) {
  const benchmark = SAVINGS_BENCHMARKS[segment] || 0.20;
  const actualRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;
  const rateScore = Math.min((actualRate / benchmark) * 80, 80);
  const consistencyScore = Math.max(0, 20 - (sipMissedLast6m * 4));
  const score = Math.min(rateScore + consistencyScore, 100);
  return {
    score,
    explanation: `Saving ${(actualRate * 100).toFixed(1)}% of income (benchmark: ${(benchmark * 100).toFixed(0)}%). ${6 - sipMissedLast6m}/6 months consistent.`,
    actualRate
  };
}

function pillarInsurance({ hasLife, hasHealth, lifeCover, healthCover, familySize, monthlyIncome }) {
  const annualIncome = monthlyIncome * 12;
  let lifeScore = 0, healthScore = 0;
  let lifeMsgs = [], healthMsgs = [];

  if (hasLife && annualIncome > 0) {
    const multiple = lifeCover / annualIncome;
    lifeScore = Math.min((multiple / 10) * 60, 60);
    lifeMsgs.push(`Life cover: ${multiple.toFixed(1)}x income (target 10x)`);
  } else {
    lifeMsgs.push('No life insurance — high-priority gap');
  }

  const requiredHealth = familySize * 500000; // ₹5L per person
  if (hasHealth && requiredHealth > 0) {
    const ratio = Math.min(healthCover / requiredHealth, 1);
    healthScore = ratio * 40;
    healthMsgs.push(`Health cover: ₹${fmt(healthCover)} for ${familySize} members`);
  } else {
    healthMsgs.push('No health insurance detected');
  }

  return {
    score: Math.min(lifeScore + healthScore, 100),
    explanation: [...lifeMsgs, ...healthMsgs].join('. ')
  };
}

function pillarInvestment({ activeSipMonthly, monthlyIncome, portfolioDriftPct, totalInvestmentValue }) {
  const sipRate = monthlyIncome > 0 ? activeSipMonthly / monthlyIncome : 0;
  const sipScore = Math.min((sipRate / 0.10) * 60, 60);
  const driftPenalty = Math.max(0, (portfolioDriftPct - 5) * 2);
  const investScore = Math.max(sipScore - driftPenalty, 0);
  const annualIncome = Math.max(monthlyIncome * 12, 1);
  const corpusMultiple = totalInvestmentValue / annualIncome;
  const corpusScore = Math.min(corpusMultiple * 8, 40);
  return {
    score: Math.min(investScore + corpusScore, 100),
    explanation: `SIP rate: ${(sipRate * 100).toFixed(1)}% of income. Portfolio drift: ${portfolioDriftPct.toFixed(1)}%. Corpus: ${corpusMultiple.toFixed(1)}x income.`
  };
}

function pillarDebt({ emiMonthly, monthlyIncome, creditUtilizationPct }) {
  const ratio = monthlyIncome > 0 ? emiMonthly / monthlyIncome : 1;
  const emiScore = Math.max(0, (1 - ratio / 0.30) * 70);
  const ccScore = Math.max(0, (1 - creditUtilizationPct / 30) * 30);
  return {
    score: Math.min(emiScore + ccScore, 100),
    explanation: `EMI burden: ${(ratio * 100).toFixed(1)}% of income (safe limit: 30%). Credit utilization: ${creditUtilizationPct.toFixed(0)}%.`
  };
}

/**
 * Main WHS computation function
 * @param {Object} inputs - User financial inputs
 * @returns {Object} WHSResult with score, grade, pillars, and action
 */
export function calculateWHS(inputs) {
  const segment = inputs.segment || 'YOUNG_EMPLOYED';
  const weights = SEGMENT_WEIGHTS[segment];

  const pillars = {
    cash_reserve: pillarCashReserve(inputs),
    savings_rate: pillarSavingsRate({ ...inputs, segment }),
    insurance:    pillarInsurance(inputs),
    investment:   pillarInvestment(inputs),
    debt:         pillarDebt(inputs),
  };

  let weightedTotal = 0;
  const pillarScores = {};
  const explanations = {};

  for (const [key, pillar] of Object.entries(pillars)) {
    const score = Math.min(Math.max(pillar.score, 0), 100);
    pillarScores[key] = Math.round(score * 10) / 10;
    explanations[key] = pillar.explanation;
    weightedTotal += score * weights[key];
  }

  const finalScore = Math.round(Math.min(Math.max(weightedTotal, 0), 100));

  const gradeMap = [
    [90, 'A+', '#10b981'], [80, 'A', '#22d3ee'],
    [65, 'B', '#3b82f6'],  [50, 'C', '#f59e0b'],
    [35, 'D', '#f97316'],  [0,  'F', '#ef4444'],
  ];
  const [, grade, gradeColor] = gradeMap.find(([t]) => finalScore >= t);

  const worstPillar = Object.entries(pillarScores)
    .sort(([a], [b]) => pillarScores[a] * weights[a] - pillarScores[b] * weights[b])[0][0];

  const actionMap = {
    cash_reserve: { label: 'Build Emergency Fund', url: '/plan/emergency-fund', icon: '🏦' },
    savings_rate: { label: 'Activate Monthly SIP', url: '/invest/sip', icon: '📈' },
    insurance:    { label: 'Review Insurance Coverage', url: '/protect/insurance', icon: '🛡️' },
    investment:   { label: 'Rebalance Portfolio', url: '/portfolio/rebalance', icon: '⚖️' },
    debt:         { label: 'Reduce EMI Burden', url: '/plan/debt', icon: '📉' },
  };

  return {
    score: finalScore,
    grade,
    gradeColor,
    pillarScores,
    pillarWeights: weights,
    explanations,
    topAction: actionMap[worstPillar],
    worstPillar,
  };
}

/**
 * Renders the WHS gauge SVG and pillar bars into the DOM
 */
export function renderWHS(result, containerEl) {
  // Gauge
  const gaugeEl = containerEl.querySelector('.gauge-fill-arc');
  if (gaugeEl) {
    const radius = 70;
    const circumference = Math.PI * radius; // semicircle
    const offset = circumference * (1 - result.score / 100);
    gaugeEl.style.strokeDasharray = `${circumference}`;
    gaugeEl.style.strokeDashoffset = `${offset}`;
    gaugeEl.style.stroke = result.gradeColor;
  }

  const scoreEl = containerEl.querySelector('.gauge-score-text');
  if (scoreEl) scoreEl.textContent = result.score;

  const gradeEl = containerEl.querySelector('.whs-grade-badge');
  if (gradeEl) {
    gradeEl.textContent = result.grade;
    gradeEl.style.color = result.gradeColor;
  }

  // Pillar bars
  const pillarNames = {
    cash_reserve: 'Emergency Reserve',
    savings_rate: 'Savings Discipline',
    insurance:    'Insurance Coverage',
    investment:   'Investment Health',
    debt:         'Debt Management',
  };

  const colors = {
    cash_reserve: '#3b82f6', savings_rate: '#10b981',
    insurance: '#f59e0b', investment: '#6366f1', debt: '#ec4899'
  };

  const barsContainer = containerEl.querySelector('.pillar-bars');
  if (barsContainer) {
    barsContainer.innerHTML = Object.entries(result.pillarScores).map(([key, score]) => `
      <div class="pillar-row" title="${result.explanations[key]}">
        <span class="pillar-name">${pillarNames[key]}</span>
        <div class="pillar-track">
          <div class="pillar-fill" style="width:${score}%; background:${colors[key]}"></div>
        </div>
        <span class="pillar-pct">${Math.round(score)}</span>
      </div>
    `).join('');
  }

  const actionEl = containerEl.querySelector('[data-whs-action]');
  if (actionEl && result.topAction) {
    actionEl.textContent = `${result.topAction.icon} ${result.topAction.label}`;
    actionEl.href = result.topAction.url;
  }
}

function fmt(paise) {
  return (paise / 100).toLocaleString('en-IN');
}
