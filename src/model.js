// ═══════════════════════════════════════════════════════════════
// AGI ECONOMY — PURE MODEL LOGIC
// General equilibrium with CES task-based production, Cournot
// markups, heterogeneous-decile capital accumulation, and a
// budget-balanced negative income tax. No UI dependencies, so it
// can be exercised directly from tests (see tests/model.test.mjs).
// ═══════════════════════════════════════════════════════════════

// ── Constants ──

export const DEMAND_EPS = 2.0;
export const LAMBDA_TAX = 0.25;
export const DWL_EXP = 0.7;
export const DEPRECIATION = 0.05;
export const T_PERIODS = 40;
export const N_DECILES = 10;
export const ALPHA_0 = 0.30;
export const A_0 = 1.0;
export const K_0 = 1.0;
export const S_BASE = 0.12;

// ── Gini coefficient ──

export function gini(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length, tot = s.reduce((a, b) => a + b, 0);
  if (tot <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += s[i] * (2 * (i + 1) - n - 1);
  return Math.min(Math.max(sum / (n * tot), 0), 1);
}

// ── Single-period equilibrium ──

export function equilibrium(alpha, sigma, N, t, A, K_total, kFracs, gamma) {
  const mu = (N * DEMAND_EPS) / Math.max(N * DEMAND_EPS - 1, 0.01);
  // Labor supply responds to both tax disincentive AND wage level
  // When alpha is high (lots of automation), effective wages fall, reducing labor supply
  const taxEffect = 1 - LAMBDA_TAX * t;
  const wageEffect = Math.pow(1 - alpha, 0.3); // labor supply falls as automation rises
  const L = Math.max(1.0 * taxEffect * wageEffect, 0.01);
  const rho = (sigma - 1) / sigma;
  // Physical bottleneck: diminishing returns to accumulated capital (gamma < 1),
  // representing a fixed complementary factor (energy / compute / land). Under
  // gamma = 1 and sigma > 1 the model is an AK economy with no balanced path
  // (Uzawa), so capital and output explode super-exponentially; gamma < 1 restores
  // a stationary capital–output ratio and keeps magnitudes finite for any sigma.
  const Kcap = Math.pow(K_total, gamma);

  let Y_pot, s_L;
  if (Math.abs(rho) < 0.005) {
    // Cobb-Douglas limit (sigma ≈ 1)
    Y_pot = Math.pow(A * Kcap, alpha) * Math.pow(L, 1 - alpha);
    s_L = 1 - alpha;
  } else {
    const tK = Math.pow(Math.max(alpha, 1e-8), 1 / sigma) * Math.pow(A * Kcap, rho);
    const tL = Math.pow(Math.max(1 - alpha, 1e-8), 1 / sigma) * Math.pow(L, rho);
    const denom = Math.max(tK + tL, 1e-10);
    Y_pot = Math.pow(denom, 1 / rho);
    s_L = tL / denom;
    // Smooth blend near sigma=1 to avoid discontinuity
    if (Math.abs(rho) < 0.05) {
      const blend = Math.abs(rho) / 0.05; // 0 at rho=0, 1 at |rho|=0.05
      const Y_cd = Math.pow(A * Kcap, alpha) * Math.pow(L, 1 - alpha);
      const s_L_cd = 1 - alpha;
      Y_pot = Y_cd * (1 - blend) + Y_pot * blend;
      s_L = s_L_cd * (1 - blend) + s_L * blend;
    }
  }

  const Y = Y_pot / Math.pow(mu, DWL_EXP);
  const laborShare = s_L / mu;
  const wagePool = laborShare * Y;
  const capitalPool = (1 - laborShare) * Y;
  const wagePer = wagePool / N_DECILES;
  const meanY = Y / N_DECILES;

  const pretax = kFracs.map(f => wagePer + capitalPool * f);
  const posttax = pretax.map(y => (1 - t) * y + t * meanY);

  // Price index: markup × unit cost, where unit cost ∝ 1/TFP
  // TFP = Y_pot / f(K,L) — use Y_pot before markup for clean separation
  const tfp = Y_pot / Math.max(Math.pow(Kcap, alpha) * Math.pow(L, 1 - alpha), 1e-10);
  const productivity = tfp;
  const priceRaw = mu / Math.max(tfp, 1e-10);

  return { Y, mu, laborShare, L, wagePool, capitalPool, pretax, posttax, priceRaw, meanY, productivity };
}

// ── Dynamic simulation ──

export function simulate({ alphaTarget, sigma, N, t, theta, gA, savingsSpread, gamma }) {
  // Initial capital distribution
  const kRaw0 = Array.from({ length: N_DECILES }, (_, i) => Math.pow(i + 1, theta));
  const kSum0 = kRaw0.reduce((a, b) => a + b, 0);
  let kAbs = kRaw0.map(k => (k / kSum0) * K_0);

  // Savings rate by decile: base rate × (1 + spread × rank/10).
  // No cap: the old 40% cap was a band-aid for the explosive accumulation that the
  // physical bottleneck (gamma) now controls. At the slider's max spread (3) the top
  // decile saves 0.48 of income, so no cap is needed — and removing it lets capital
  // concentration reflect the differential-savings story (it also fixes the backwards
  // quirk where raising the spread pushed top deciles into the cap and *reduced*
  // inequality by equalizing their savings rates).
  const savingsRates = Array.from({ length: N_DECILES }, (_, i) =>
    S_BASE * (1 + savingsSpread * ((i + 1) / N_DECILES))
  );

  const history = [];

  for (let tp = 0; tp <= T_PERIODS; tp++) {
    // Logistic automation path
    const logArg = 0.25 * (tp - T_PERIODS * 0.4);
    const frac = 1 / (1 + Math.exp(-logArg));
    const alpha_t = ALPHA_0 + (alphaTarget - ALPHA_0) * frac;
    const A_t = A_0 * Math.pow(1 + gA, tp);
    const K_total = kAbs.reduce((a, b) => a + b, 0);
    const kFracs = kAbs.map(k => k / Math.max(K_total, 1e-10));

    const eq = equilibrium(alpha_t, sigma, N, t, A_t, K_total, kFracs, gamma);

    const rec = {
      period: tp,
      alpha: alpha_t,
      A: A_t,
      K: K_total,
      Y: eq.Y,
      laborShare: eq.laborShare,
      mu: eq.mu,
      priceRaw: eq.priceRaw,
      giniPre: gini(eq.pretax),
      giniPost: gini(eq.posttax),
      pretax: [...eq.pretax],
      posttax: [...eq.posttax],
      kFracs: [...kFracs],
      kAbs: [...kAbs],
      topBottom: eq.posttax[9] / Math.max(eq.posttax[0], 1e-10),
      d1Post: eq.posttax[0],
      d5Post: eq.posttax[4],
      d10Post: eq.posttax[9],
      productivity: eq.productivity,
    };
    history.push(rec);

    // Capital accumulation (except last period)
    if (tp < T_PERIODS) {
      kAbs = kAbs.map((k, i) => {
        const saving = savingsRates[i] * Math.max(eq.posttax[i], 0);
        return Math.max((1 - DEPRECIATION) * k + saving, 0);
      });
    }
  }

  // Price index, split into two lines, both normalized so the COMPETITIVE price
  // (marginal cost = 1/Z) is 1 at t=0:
  //   priceComp   = Z_0 / Z_t           — what prices would be under competition
  //   priceActual = μ · priceComp       — actual markup-inclusive price
  // The gap between them is the productivity gain captured as profit instead of
  // passed to consumers as lower prices. (The markup μ no longer cancels out, as
  // it did in the old single normalized index.)
  const z0 = history[0].productivity;
  history.forEach(h => {
    h.priceComp = z0 / Math.max(h.productivity, 1e-10);
    h.priceActual = h.mu * h.priceComp;
    h.price = h.priceActual; // headline "price level" = the actual price people pay
  });

  // Real purchasing power. This is a one-good economy, so each decile's real
  // consumption is simply its share of real output — post-tax income already IS
  // real purchasing power. We do NOT deflate by the price index (doing so double-
  // counted productivity, since output already rises with it).
  history.forEach(h => {
    h.d1Real = h.d1Post;
    h.d5Real = h.d5Post;
    h.d10Real = h.d10Post;
    h.realOutputPC = h.Y / N_DECILES;
  });

  return history;
}

// ── Presets ──

export const PRESETS = [
  { id: "base", label: "Today's Trajectory", icon: "◉",
    alphaTarget: 0.50, sigma: 1.0, N: 12, t: 0.10, theta: 2.5, gA: 0.02, savingsSpread: 1.5, gamma: 0.90 },
  { id: "dys",  label: "AI Dystopia",       icon: "▼",
    alphaTarget: 0.90, sigma: 1.8, N: 2,  t: 0.00, theta: 3.5, gA: 0.08, savingsSpread: 2.5, gamma: 0.90 },
  { id: "uto",  label: "AI Utopia",         icon: "▲",
    alphaTarget: 0.90, sigma: 1.8, N: 30, t: 0.30, theta: 3.5, gA: 0.08, savingsSpread: 2.5, gamma: 0.90 },
  { id: "ubi",  label: "Redistribution Only", icon: "◐",
    alphaTarget: 0.90, sigma: 1.8, N: 2,  t: 0.40, theta: 3.5, gA: 0.08, savingsSpread: 2.5, gamma: 0.90 },
  { id: "comp", label: "Competition Only",  icon: "◑",
    alphaTarget: 0.90, sigma: 1.8, N: 30, t: 0.00, theta: 3.5, gA: 0.08, savingsSpread: 2.5, gamma: 0.90 },
];

export const DEFAULT_PRESET = PRESETS[0];
