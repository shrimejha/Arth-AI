/**
 * Avatar Base — Avatar NLG Engine (Frontend)
 * Generates 3-part micro-copy cards: What → Why → Action
 * Tone-adaptive per lifecycle segment
 */

import { fmt } from './tax-optimizer.js';

const SEGMENT_TONES = {
  CHILD:          'encouraging',
  STUDENT:        'aspirational',
  YOUNG_EMPLOYED: 'efficient',
  SENIOR:         'reassuring',
};

const SEBI_FOOTER = `⚠️ Investments subject to market risk. Read all documents carefully. Avatar Base is an AI system, not a SEBI-registered human advisor. All equity suggestions are sourced from SEBI-registered Research Analysts only.`;
const TAX_DISCLAIMER = `This is general tax-planning information, not licensed tax advice. Consult a Chartered Accountant for personalized tax guidance.`;

// ── Avatar Personas ───────────────────────────────────────────────────
const AVATAR_PERSONAS = {
  YOUNG_EMPLOYED: { name: 'Arya', greeting: "Let's make your money work harder." },
  STUDENT:        { name: 'Nova', greeting: "Building your future, one step at a time." },
  SENIOR:         { name: 'Sahaya', greeting: "I'm here to help you stay safe and comfortable." },
  CHILD:          { name: 'Buddy', greeting: "Let's save up for something awesome!" },
};

// ── Micro-Copy Card Generator ──────────────────────────────────────────
export function generateCard({ type, segment, data, modelVersion = 'v1.2.0' }) {
  const tone = SEGMENT_TONES[segment] || 'efficient';
  const cardId = `card-${type}-${Date.now()}`;

  const generators = {
    TAX_80C:       () => gen80CCard(segment, tone, data, cardId),
    PORTFOLIO_DRIFT: () => genDriftCard(segment, tone, data, cardId),
    SALARY_SPLIT:  () => genSalarySplitCard(segment, tone, data, cardId),
    FRAUD_ALERT:   () => genFraudCard(segment, data, cardId),
    WHS_IMPROVEMENT: () => genWHSCard(segment, tone, data, cardId),
    CAPITAL_GAINS: () => genCGCard(segment, tone, data, cardId),
    REGIME_SWITCH: () => genRegimeCard(segment, tone, data, cardId),
    INSURANCE_GAP: () => genInsuranceCard(segment, tone, data, cardId),
    NPS_PUSH:      () => genNPSCard(segment, tone, data, cardId),
    SENIOR_80TTB:  () => genSenior80TTBCard(segment, data, cardId),
  };

  const gen = generators[type];
  if (!gen) return null;
  return { ...gen(), cardId, type, segment, modelVersion, createdAt: new Date().toISOString() };
}

// ── Card Templates ─────────────────────────────────────────────────────
function gen80CCard(segment, tone, data, cardId) {
  const remaining = data.remaining || 0;
  const savings = Math.round(remaining * 0.30);
  const instrument = data.topRecommendation || 'ELSS fund';
  const month = new Date().toLocaleString('default', { month: 'long' });

  const whats = {
    efficient:   `Invest ₹${fmt(remaining)} before March 31 — save up to ₹${fmt(savings)} in tax.`,
    reassuring:  `₹${fmt(remaining)} left in your 80C limit — let's make sure it works for you.`,
    aspirational:`Your 80C limit has ₹${fmt(remaining)} unused — start investing in your future today.`,
    encouraging: `Help grow your savings! ₹${fmt(remaining)} is still available to invest.`,
  };

  const whys = {
    efficient:   `The government allows up to ₹1.5L tax-free investments each year. Your ${instrument} investment reduces your taxable income directly. ${month} is a great time to deploy this.`,
    reassuring:  `This is a safe way to reduce your tax bill this year. An ${instrument} with lock-in of 3 years offers good returns with government backing on tax benefits.`,
    aspirational:`Every rupee you invest in 80C now cuts your tax bill AND builds your future wealth. An ${instrument} grows at market rates while protecting your income.`,
    encouraging: `Your parents have set aside ₹${fmt(remaining)} to grow in a savings plan. It's like a magic jar that grows bigger every year!`,
  };

  return {
    accent: 'tax',
    typeBadge: 'Tax Savings',
    what: whats[tone] || whats.efficient,
    why: whys[tone] || whys.efficient,
    actionLabel: 'Invest Now',
    actionUrl: `/invest/80c?amount=${remaining}`,
    authLevel: 2,
    disclosure: TAX_DISCLAIMER,
    dataUsed: ['TAX_PROFILE', 'TRANSACTION_HISTORY'],
    explainRef: `/why/${cardId}`,
    confidence: 0.92,
    isTimeSensitive: true,
    urgency: data.urgency || 'MEDIUM',
  };
}

function genDriftCard(segment, tone, data, cardId) {
  const { assetClass, drift, direction, current, target } = data;
  const absDrift = Math.abs(drift).toFixed(1);
  return {
    accent: 'portfolio',
    typeBadge: 'Portfolio Alert',
    what: `Your ${assetClass} is ${direction.toLowerCase()} by ${absDrift}% — rebalancing recommended.`,
    why: `Markets shifted your portfolio away from your target. ${assetClass} is now ${current}% (target: ${target}%). Keeping allocation in check protects you from outsized risk in one area.`,
    actionLabel: 'Review Rebalancing',
    actionUrl: `/portfolio/rebalance?alert_id=${cardId}`,
    authLevel: 2,
    disclosure: SEBI_FOOTER,
    dataUsed: ['PORTFOLIO_DATA', 'MARKET_DATA'],
    explainRef: `/why/${cardId}`,
    confidence: 0.95,
    isTimeSensitive: false,
  };
}

function genSalarySplitCard(segment, tone, data, cardId) {
  const { netSalary, elssSIP, npsContrib, efContrib, taxSaving } = data;
  return {
    accent: 'salary',
    typeBadge: 'Salary Day',
    what: `Your ₹${fmt(netSalary)} salary is in — here's your smart money split.`,
    why: `₹${fmt(efContrib)} to emergency fund, ₹${fmt(elssSIP)} as ELSS tax-saver SIP, ₹${fmt(npsContrib)} to NPS. This split could save you ₹${fmt(taxSaving)} in taxes this year — all in one tap.`,
    actionLabel: 'Confirm & Activate SIPs',
    actionUrl: '/salary-split/confirm',
    authLevel: 2,
    disclosure: SEBI_FOOTER,
    dataUsed: ['TRANSACTION_HISTORY', 'TAX_PROFILE', 'PORTFOLIO_DATA'],
    explainRef: `/why/${cardId}`,
    confidence: 0.91,
    isTimeSensitive: true,
  };
}

function genFraudCard(segment, data, cardId) {
  return {
    accent: 'fraud',
    typeBadge: 'Security Alert',
    what: `Unusual activity detected on your account — action required.`,
    why: `${data.description || 'We noticed a transaction that doesn\'t match your normal pattern'}. Risk score: ${((data.riskScore || 0.8) * 100).toFixed(0)}%. If this was not you, block your account immediately.`,
    actionLabel: 'Block Account & Verify',
    actionUrl: '/emergency/block-account',
    authLevel: 1,
    disclosure: 'This is a real-time security alert from Avatar Base Fraud Sentinel. Contact the bank helpline: 1800-XXX-XXXX.',
    dataUsed: ['TRANSACTION_HISTORY', 'DEVICE_FINGERPRINT', 'BEHAVIORAL_BIOMETRICS'],
    explainRef: `/why/${cardId}`,
    confidence: data.riskScore || 0.85,
    isTimeSensitive: true,
    isDismissible: false,
  };
}

function genWHSCard(segment, tone, data, cardId) {
  const { score, grade, gradeColor, topAction } = data;
  const tonePrefix = {
    efficient: "Your financial health at a glance:",
    reassuring: "Here's how your finances are looking:",
    aspirational: "Your wealth journey score:",
    encouraging: "Let's see how well you're saving!",
  };
  return {
    accent: 'whs',
    typeBadge: 'Wealth Health',
    what: `${tonePrefix[tone]} Score ${score}/100 — Grade ${grade}`,
    why: data.explanation || `${topAction?.label || 'Review your financial profile'} is your biggest opportunity to improve your score this month.`,
    actionLabel: topAction?.label || 'See Full Analysis',
    actionUrl: topAction?.url || '/dashboard',
    authLevel: 1,
    disclosure: 'Wealth Health Score is an illustrative indicator, not a guarantee of financial outcomes.',
    dataUsed: ['TRANSACTION_HISTORY', 'PORTFOLIO_DATA', 'INSURANCE_DATA'],
    explainRef: `/why/${cardId}`,
    confidence: 0.90,
    isTimeSensitive: false,
  };
}

function genCGCard(segment, tone, data, cardId) {
  const { totalTax, daysToFYEnd, totalHarvestSaving, netLTCG, netSTCG } = data;
  return {
    accent: 'tax',
    typeBadge: '📋 Capital Gains',
    what: `Estimated capital gains tax: ₹${fmt(totalTax)} — ${daysToFYEnd} days to act.`,
    why: `₹${fmt(netLTCG)} in long-term and ₹${fmt(netSTCG)} in short-term gains this year. Booking strategic losses could save up to ₹${fmt(totalHarvestSaving)}. March 31 is the last date.`,
    actionLabel: 'Review Tax-Loss Harvesting',
    actionUrl: `/tax/capital-gains`,
    authLevel: 2,
    disclosure: TAX_DISCLAIMER + ' ' + SEBI_FOOTER,
    dataUsed: ['PORTFOLIO_DATA', 'CAPITAL_GAINS_LEDGER'],
    explainRef: `/why/${cardId}`,
    confidence: 0.89,
    isTimeSensitive: true,
  };
}

function genRegimeCard(segment, tone, data, cardId) {
  const { recommended, savings, verdict } = data;
  return {
    accent: 'tax',
    typeBadge: '🔄 Tax Regime',
    what: `${recommended} Tax Regime is better for you — saves ₹${fmt(savings)} this year.`,
    why: verdict,
    actionLabel: `Switch to ${recommended} Regime`,
    actionUrl: '/tax/regime-switch',
    authLevel: 3,
    disclosure: TAX_DISCLAIMER,
    dataUsed: ['TAX_PROFILE', 'TRANSACTION_HISTORY'],
    explainRef: `/why/${cardId}`,
    confidence: 0.88,
    isTimeSensitive: true,
  };
}

function genInsuranceCard(segment, tone, data, cardId) {
  return {
    accent: 'insurance',
    typeBadge: 'Insurance Gap',
    what: `Your ${data.gapType || 'health'} insurance coverage has a gap of ₹${fmt(data.gap || 0)}.`,
    why: `Your current coverage of ₹${fmt(data.current || 0)} is below the recommended ₹${fmt(data.recommended || 0)} for your family size. Adequate coverage protects your savings from medical emergencies.`,
    actionLabel: 'Explore Insurance Options',
    actionUrl: '/protect/insurance',
    authLevel: 2,
    disclosure: 'Insurance is subject to terms and conditions. Read policy documents carefully.',
    dataUsed: ['INSURANCE_DATA'],
    explainRef: `/why/${cardId}`,
    confidence: 0.87,
    isTimeSensitive: false,
  };
}

function genNPSCard(segment, tone, data, cardId) {
  const headroom = data.remaining || 50000;
  return {
    accent: 'tax',
    typeBadge: 'NPS Opportunity',
    what: `Save ₹${fmt(Math.round(headroom * 0.30))} more in tax with NPS — ₹${fmt(headroom)} headroom left.`,
    why: `Section 80CCD(1B) gives you an additional ₹50,000 deduction beyond your 80C limit — exclusive to NPS. Even in the ${data.taxBracket || '30%'} bracket, this saves ₹${fmt(Math.round(headroom * 0.30))} annually.`,
    actionLabel: 'Contribute to NPS',
    actionUrl: '/invest/nps',
    authLevel: 2,
    disclosure: TAX_DISCLAIMER,
    dataUsed: ['TAX_PROFILE'],
    explainRef: `/why/${cardId}`,
    confidence: 0.93,
    isTimeSensitive: true,
  };
}

function genSenior80TTBCard(segment, data, cardId) {
  const fdInterest = data.fdInterest || 0;
  const eligible = Math.min(fdInterest, 50000);
  return {
    accent: 'tax',
    typeBadge: 'Section 80TTB',
    what: `As a senior, your FD interest up to ₹50,000 is tax-deductible under Section 80TTB.`,
    why: `Your FD interest this year is ₹${fmt(fdInterest)}. You can claim ₹${fmt(eligible)} as a deduction under 80TTB, available exclusively to senior citizens. This reduces your taxable income directly.`,
    actionLabel: 'Claim 80TTB Deduction',
    actionUrl: '/tax/80ttb',
    authLevel: 2,
    disclosure: TAX_DISCLAIMER,
    dataUsed: ['TAX_PROFILE', 'TRANSACTION_HISTORY'],
    explainRef: `/why/${cardId}`,
    confidence: 0.95,
    isTimeSensitive: false,
  };
}

// ── Card Renderer ──────────────────────────────────────────────────────
export function renderCard(card, parentEl) {
  const div = document.createElement('div');
  div.className = 'rec-card';
  div.id = card.cardId;
  div.innerHTML = `
    <div class="rec-card-accent ${card.accent || ''}"></div>
    <div class="rec-card-body">
      <div class="rec-type-badge">${card.typeBadge}</div>
      <div class="rec-what">${card.what}</div>
      <div class="rec-why">${card.why}</div>
      <div class="rec-action-row">
        <button class="rec-cta-btn ${card.accent === 'fraud' ? 'danger' : ''}"
          onclick="handleCardAction('${card.cardId}', '${card.actionUrl}', ${card.authLevel})">
          ${card.actionLabel} →
        </button>
        <a href="${card.explainRef}" class="rec-why-link">Why am I seeing this?</a>
      </div>
      <div class="confidence-bar">
        <span class="confidence-label">Confidence</span>
        <div class="confidence-track">
          <div class="confidence-fill" style="width:${(card.confidence * 100).toFixed(0)}%"></div>
        </div>
        <span class="confidence-label">${(card.confidence * 100).toFixed(0)}%</span>
      </div>
      <div class="sebi-disclosure">${card.disclosure}</div>
    </div>
  `;
  parentEl.appendChild(div);
  return div;
}

export function renderCardGrid(cards, gridEl) {
  gridEl.innerHTML = '';
  cards.forEach(card => renderCard(card, gridEl));
}

// ── Conversational Avatar Responses ───────────────────────────────────
export function getAvatarResponse(userMessage, segment, context) {
  const msg = userMessage.toLowerCase();
  const persona = AVATAR_PERSONAS[segment] || AVATAR_PERSONAS.YOUNG_EMPLOYED;
  const tone = SEGMENT_TONES[segment];

  if (msg.includes('score') || msg.includes('whs') || msg.includes('health')) {
    return `Your Wealth Health Score is **${context.whs || 72}/100** (Grade ${context.whsGrade || 'B'}). ${context.topAction ? `Your biggest opportunity right now: **${context.topAction}**.` : ''}`;
  }
  if (msg.includes('tax') || msg.includes('80c') || msg.includes('save')) {
    return `You have **₹${fmt(context.sec80cRemaining || 45000)}** unused in your 80C limit this financial year. An ELSS SIP started today could save you up to **₹${fmt(Math.round((context.sec80cRemaining || 45000) * 0.30))}** in tax by March 31. Want me to show you the best options?`;
  }
  if (msg.includes('portfolio') || msg.includes('invest') || msg.includes('fund')) {
    return `Your portfolio is ${context.driftAlerts > 0 ? `showing **${context.driftAlerts} drift alert${context.driftAlerts > 1 ? 's' : ''}**` : 'well-balanced'}. ${context.driftAlerts ? 'I recommend reviewing your asset allocation.' : 'Keep your SIPs running consistently!'}`;
  }
  if (msg.includes('fraud') || msg.includes('safe') || msg.includes('secure')) {
    return `Your account security is ${context.fraudAlerts ? 'Flagged — please review the alert on your dashboard immediately' : 'Normal. No suspicious activity detected in the last 30 days'}.`;
  }
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('help')) {
    return `${persona.greeting} I'm ${persona.name}, your AI wealth advisor. Ask me about your Wealth Health Score, tax savings, portfolio, or anything financial!`;
  }

  return `I can help with your Wealth Health Score, tax optimization (80C, 80D, NPS), portfolio rebalancing, and financial planning. What would you like to explore first?`;
}

export { SEBI_FOOTER, TAX_DISCLAIMER, AVATAR_PERSONAS };
