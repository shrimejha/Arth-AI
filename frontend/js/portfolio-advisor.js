/**
 * Avatar Base — Portfolio Advisor Engine (Frontend)
 * SEBI-compliant drift detection, concentration alerts, suitability gate
 */

const DRIFT_THRESHOLD = 5.0;           // >5% triggers alert
const CONCENTRATION_THRESHOLD = 20.0; // >20% single stock/sector triggers alert

const SEBI_DISCLOSURE = `⚠️ REGULATORY DISCLOSURE: Investments in securities market are subject to market risks. Read all scheme-related documents carefully before investing. Past performance is not indicative of future returns. Avatar Base is an AI system — not a SEBI-registered Investment Adviser (IA). For personalised advice, consult a SEBI-registered IA. Stock recommendations originate exclusively from SEBI-registered Research Analysts.`;

const RISK_ORDER = { CONSERVATIVE: 1, MODERATE: 2, AGGRESSIVE: 3, GROWTH: 4, LOW: 1, MEDIUM: 2, HIGH: 3, VERY_HIGH: 4 };

// ── Asset Allocation Computation ──────────────────────────────────────
export function computeAssetAllocation(holdings) {
  const totals = {};
  let grandTotal = 0;
  for (const h of holdings) {
    const ac = h.assetClass || 'UNKNOWN';
    totals[ac] = (totals[ac] || 0) + (h.currentValue || 0);
    grandTotal += (h.currentValue || 0);
  }
  if (grandTotal === 0) return {};
  return Object.fromEntries(
    Object.entries(totals).map(([k, v]) => [k, parseFloat((v / grandTotal * 100).toFixed(2))])
  );
}

// ── Drift Alert Detection ─────────────────────────────────────────────
export function detectDriftAlerts(currentAlloc, targetAlloc) {
  const alerts = [];
  for (const [assetClass, target] of Object.entries(targetAlloc)) {
    const current = currentAlloc[assetClass] || 0;
    const drift = current - target;
    if (Math.abs(drift) > DRIFT_THRESHOLD) {
      const direction = drift > 0 ? 'OVERWEIGHT' : 'UNDERWEIGHT';
      alerts.push({
        assetClass, current, target, drift: parseFloat(drift.toFixed(2)),
        direction,
        severity: Math.abs(drift) > 10 ? 'HIGH' : 'MEDIUM',
        action: direction === 'OVERWEIGHT'
          ? `Trim ${assetClass} by ~${Math.abs(drift).toFixed(1)}% — consider profit-booking into underweight classes.`
          : `Top up ${assetClass} by ~${Math.abs(drift).toFixed(1)}% to restore target allocation.`,
        sebiDisclosure: SEBI_DISCLOSURE,
      });
    }
  }
  return alerts;
}

// ── Concentration Risk Detection ──────────────────────────────────────
export function detectConcentrationRisks(holdings) {
  const totalValue = holdings.reduce((s, h) => s + (h.currentValue || 0), 0);
  if (totalValue === 0) return [];

  const alerts = [];
  const stockMap = {};
  const sectorMap = {};

  for (const h of holdings) {
    if (h.instrumentType !== 'EQUITY') continue;
    const pct = h.currentValue / totalValue * 100;
    const isin = h.isin || h.name;
    stockMap[isin] = { name: h.name, pct: (stockMap[isin]?.pct || 0) + pct };
    const sector = h.sector || 'Unknown';
    sectorMap[sector] = (sectorMap[sector] || 0) + pct;
  }

  for (const [isin, info] of Object.entries(stockMap)) {
    if (info.pct > CONCENTRATION_THRESHOLD) {
      alerts.push({
        type: 'SINGLE_STOCK', identifier: isin, name: info.name,
        pct: parseFloat(info.pct.toFixed(2)), threshold: CONCENTRATION_THRESHOLD,
        severity: info.pct > 30 ? 'HIGH' : 'MEDIUM',
        action: `${info.name} is ${info.pct.toFixed(1)}% of portfolio (safe limit: ${CONCENTRATION_THRESHOLD}%). Consider partial profit-booking.`,
        sebiDisclosure: SEBI_DISCLOSURE,
      });
    }
  }

  for (const [sector, pct] of Object.entries(sectorMap)) {
    if (pct > CONCENTRATION_THRESHOLD) {
      alerts.push({
        type: 'SECTOR', identifier: sector, name: sector,
        pct: parseFloat(pct.toFixed(2)), threshold: CONCENTRATION_THRESHOLD,
        severity: pct > 35 ? 'HIGH' : 'MEDIUM',
        action: `${sector} exposure (${pct.toFixed(1)}%) exceeds ${CONCENTRATION_THRESHOLD}% sector limit. Diversify across sectors.`,
        sebiDisclosure: SEBI_DISCLOSURE,
      });
    }
  }
  return alerts;
}

// ── Execution Suitability Gate ────────────────────────────────────────
export function checkSuitability({ userRiskProfile, instrumentRiskLevel, sebiRaValidated }) {
  // Hard compliance block if not RA-validated
  if (!sebiRaValidated) {
    return {
      isSuitable: false,
      canOverride: false,
      blockType: 'COMPLIANCE_HARD_BLOCK',
      message: '🚫 COMPLIANCE BLOCK: This instrument has not been validated by a SEBI-registered Research Analyst. Transaction cannot proceed. Avatar Base only recommends RA-approved instruments.',
      sebiDisclosure: SEBI_DISCLOSURE,
    };
  }

  const userTolerance = RISK_ORDER[userRiskProfile] || 0;
  const instrumentRisk = RISK_ORDER[instrumentRiskLevel] || 0;

  if (instrumentRisk > userTolerance) {
    return {
      isSuitable: false,
      canOverride: true,
      blockType: 'SUITABILITY_MISMATCH',
      message: `⚠️ Suitability mismatch: This instrument is rated '${instrumentRiskLevel}' risk but your profile is '${userRiskProfile}'. You may proceed with explicit acknowledgment of the additional risk.`,
      sebiDisclosure: SEBI_DISCLOSURE,
    };
  }

  return { isSuitable: true, canOverride: false, blockType: null, message: null, sebiDisclosure: SEBI_DISCLOSURE };
}

// ── Portfolio Rebalancing Suggestions ─────────────────────────────────
export function generateRebalancingSuggestions(driftAlerts, holdings) {
  return driftAlerts.map(alert => {
    const targetChange = Math.abs(alert.drift);
    return {
      assetClass: alert.assetClass,
      direction: alert.direction,
      changeRequired: `${targetChange.toFixed(1)}%`,
      suggestedAction: alert.action,
      sebiDisclosure: SEBI_DISCLOSURE,
      requiresAuth: 2,
    };
  });
}

export { SEBI_DISCLOSURE };
