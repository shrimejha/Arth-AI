/**
 * Avatar Base — Fraud Sentinel (Frontend)
 * Real-time velocity rules, device fingerprinting, biometric anomaly scoring
 */

// ── Velocity Rules ────────────────────────────────────────────────────
const VELOCITY_RULES = [
  {
    id: 'VR001', desc: 'High-frequency small transactions (structuring pattern)',
    windowMin: 60, maxCount: 10, maxAmount: 500000, segments: ['ALL'], action: 'BLOCK'
  },
  {
    id: 'VR002', desc: 'Multiple large transfers in 24h',
    windowMin: 1440, maxCount: 3, maxAmount: 5000000, segments: ['ALL'], action: 'STEP_UP_AUTH'
  },
  {
    id: 'VR003', desc: 'Senior: any unusual large outflow',
    windowMin: 1440, maxCount: 2, maxAmount: 500000, segments: ['SENIOR'], action: 'ALERT_RM'
  },
  {
    id: 'VR004', desc: 'Senior: new beneficiary + large transfer',
    windowMin: 60, maxCount: 1, maxAmount: 100000, segments: ['SENIOR'], action: 'BLOCK'
  },
  {
    id: 'VR005', desc: 'Midnight hour transaction (11PM–5AM) for Senior',
    windowMin: 60, maxCount: 5, maxAmount: 200000, segments: ['SENIOR'], action: 'STEP_UP_AUTH'
  },
];

// ── Velocity Check ────────────────────────────────────────────────────
export function checkVelocityRules({ segment, recentTxns, newTxnAmount, newTxnTimestamp, isNewBeneficiary = false }) {
  const signals = [];
  const now = new Date(newTxnTimestamp);

  const applicable = VELOCITY_RULES.filter(r => r.segments.includes('ALL') || r.segments.includes(segment));

  for (const rule of applicable) {
    if (rule.id === 'VR004' && !isNewBeneficiary) continue;
    if (rule.id === 'VR005') {
      const hour = now.getHours();
      if (hour >= 5 && hour < 23) continue;
    }

    const windowStart = new Date(now.getTime() - rule.windowMin * 60 * 1000);
    const windowTxns = recentTxns.filter(t => new Date(t.timestamp) >= windowStart);
    const windowCount = windowTxns.length;
    const windowAmount = windowTxns.reduce((s, t) => s + (t.amount || 0), 0) + newTxnAmount;

    if (windowCount >= rule.maxCount || windowAmount >= rule.maxAmount) {
      const riskScore = Math.min(
        (windowCount / rule.maxCount + windowAmount / rule.maxAmount) / 2, 1.0
      );
      signals.push({
        ruleId: rule.id,
        signalType: 'VELOCITY',
        severity: riskScore > 0.7 ? 'HIGH' : 'MEDIUM',
        riskScore: parseFloat(riskScore.toFixed(4)),
        description: rule.desc,
        action: rule.action,
        autoBlocked: rule.action === 'BLOCK',
      });
    }
  }
  return signals;
}

// ── Device Fingerprinting (Browser-side) ──────────────────────────────
export async function captureDeviceFingerprint() {
  const fp = {
    userAgent:   navigator.userAgent,
    platform:    navigator.platform || 'unknown',
    language:    navigator.language,
    timezone:    Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen:      `${screen.width}x${screen.height}x${screen.colorDepth}`,
    concurrency: navigator.hardwareConcurrency || 0,
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack:  navigator.doNotTrack || 'unknown',
    touchPoints: navigator.maxTouchPoints || 0,
  };

  const fpString = JSON.stringify(fp);
  // SHA-256 via Web Crypto API
  const encoded = new TextEncoder().encode(fpString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { fingerprint, metadata: fp };
}

// ── Behavioral Biometrics ─────────────────────────────────────────────
export class BiometricCollector {
  constructor() {
    this.keyEvents = [];
    this.swipeEvents = [];
    this.tapEvents = [];
    this._listening = false;
  }

  start() {
    if (this._listening) return;
    this._listening = true;
    this._onKeydown = (e) => this.keyEvents.push({ key: e.code, time: Date.now(), type: 'down' });
    this._onKeyup   = (e) => this.keyEvents.push({ key: e.code, time: Date.now(), type: 'up' });
    this._onTouch   = (e) => this.tapEvents.push({ x: e.touches[0]?.clientX, y: e.touches[0]?.clientY, time: Date.now() });
    document.addEventListener('keydown', this._onKeydown);
    document.addEventListener('keyup', this._onKeyup);
    document.addEventListener('touchstart', this._onTouch, { passive: true });
  }

  stop() {
    document.removeEventListener('keydown', this._onKeydown);
    document.removeEventListener('keyup', this._onKeyup);
    document.removeEventListener('touchstart', this._onTouch);
    this._listening = false;
  }

  getMetrics() {
    const pairs = [];
    for (let i = 0; i < this.keyEvents.length - 1; i++) {
      const cur = this.keyEvents[i];
      const nxt = this.keyEvents[i + 1];
      if (cur.type === 'down' && nxt.type === 'up' && cur.key === nxt.key) {
        pairs.push(nxt.time - cur.time); // dwell time
      }
    }
    const avgDwell = pairs.length ? pairs.reduce((s, v) => s + v, 0) / pairs.length : 120;
    const variance = pairs.length > 1
      ? pairs.reduce((s, v) => s + (v - avgDwell) ** 2, 0) / pairs.length : 50;

    return {
      avgKeystrokeDwellMs: parseFloat(avgDwell.toFixed(2)),
      keystrokeVariance: parseFloat(variance.toFixed(2)),
      sampleCount: pairs.length,
    };
  }

  /**
   * Compute anomaly z-score vs. historical baseline
   * Returns { isAnomalous, zScore }
   */
  scoreAnomaly(historical = { avgDwell: 120, variance: 50 }) {
    const metrics = this.getMetrics();
    if (metrics.sampleCount < 5) return { isAnomalous: false, zScore: 0 };
    const deviation = Math.abs(metrics.avgKeystrokeDwellMs - historical.avgDwell);
    const zScore = deviation / Math.max(Math.sqrt(historical.variance), 1);
    return {
      isAnomalous: zScore > 3.0,
      zScore: parseFloat(zScore.toFixed(2)),
      metrics,
    };
  }
}

// ── Anomaly Risk Score (Isolation Forest approximation) ───────────────
export function computeIsolationScore(features) {
  /**
   * Browser-side lightweight anomaly scorer.
   * Normalizes 6 behavioral features and returns a risk score 0-1.
   * A full Isolation Forest runs on the backend; this provides fast UX-level feedback.
   */
  const {
    txnAmount = 0,          avgTxnAmount = 5000,
    hourOfDay = 12,         typicalHour = 14,
    newMerchant = false,    merchantFamiliarityScore = 1.0,
    velocityZ = 0,
    deviceTrustScore = 1.0,
    biometricZ = 0,
  } = features;

  const amountZ   = Math.min(Math.abs(txnAmount - avgTxnAmount) / Math.max(avgTxnAmount, 1), 3) / 3;
  const hourZ     = Math.min(Math.abs(hourOfDay - typicalHour) / 12, 1);
  const merchantZ = newMerchant ? (1 - merchantFamiliarityScore) : 0;
  const velZ      = Math.min(velocityZ / 3, 1);
  const devZ      = 1 - deviceTrustScore;
  const bioZ      = Math.min(biometricZ / 5, 1);

  // Weighted composite
  const score = (amountZ * 0.20 + hourZ * 0.15 + merchantZ * 0.20 +
                 velZ * 0.20 + devZ * 0.15 + bioZ * 0.10);

  const severity = score > 0.7 ? 'CRITICAL' : score > 0.5 ? 'HIGH' :
                   score > 0.3 ? 'MEDIUM' : 'LOW';

  return { score: parseFloat(score.toFixed(4)), severity, breakdown: { amountZ, hourZ, merchantZ, velZ, devZ, bioZ } };
}

// ── Fraud Alert Renderer ──────────────────────────────────────────────
export function renderFraudBanner(container, signals, segment) {
  if (!signals || signals.length === 0) {
    container.style.display = 'none';
    return;
  }

  const top = signals.sort((a, b) => b.riskScore - a.riskScore)[0];
  container.style.display = 'flex';
  container.innerHTML = `
    <div class="fraud-banner-icon">🚨</div>
    <div class="fraud-banner-content">
      <div class="fraud-banner-title">
        ${top.autoBlocked ? 'Transaction Blocked for Your Safety' : 'Unusual Activity Detected'}
      </div>
      <div class="fraud-banner-sub">
        ${top.description} · Risk score: ${(top.riskScore * 100).toFixed(0)}% · 
        Action: ${top.action.replace(/_/g, ' ')}
      </div>
    </div>
    <button class="btn btn-danger btn-sm" onclick="emergencyBlock()">
      🛑 Block Account
    </button>
    ${segment === 'SENIOR' ? '<button class="btn btn-secondary btn-sm ml-2" onclick="callRM()">📞 Call RM</button>' : ''}
  `;
}

function emergencyBlock() {
  alert('🚨 Your account has been temporarily blocked for safety. Please call the bank helpline: 1800-XXX-XXXX');
}

function callRM() {
  alert('📞 Connecting you to your Relationship Manager. RM will call your registered number within 2 minutes.');
}
