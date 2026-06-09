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

export function equilibrium(alpha, sigma, N, t, A, K_total, kFracs, gamma, zRef = null) {
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

  // The sigma->1 limit of this CES is NOT plain Cobb-Douglas: with share
  // weights alpha^(1/sigma), expanding ln Y around rho=0 leaves an extra
  // entropy factor e^{H(alpha)}, H(alpha) = -alpha*ln(alpha) - (1-alpha)*ln(1-alpha).
  // Omitting it made output dip artificially at sigma=1 (Y was ~half its
  // value just outside the blend window). The labor-share limit is still 1-alpha.
  const aC = Math.min(Math.max(alpha, 1e-8), 1 - 1e-8);
  const H_alpha = -aC * Math.log(aC) - (1 - aC) * Math.log(1 - aC);
  const Y_cd = Math.exp(H_alpha) * Math.pow(A * Kcap, alpha) * Math.pow(L, 1 - alpha);

  let Y_pot, s_L;
  if (Math.abs(rho) < 0.005) {
    // Cobb-Douglas limit (sigma ≈ 1)
    Y_pot = Y_cd;
    s_L = 1 - alpha;
  } else {
    const tK = Math.pow(Math.max(alpha, 1e-8), 1 / sigma) * Math.pow(A * Kcap, rho);
    const tL = Math.pow(Math.max(1 - alpha, 1e-8), 1 / sigma) * Math.pow(L, rho);
    const denom = Math.max(tK + tL, 1e-10);
    Y_pot = Math.pow(denom, 1 / rho);
    s_L = tL / denom;
    // Smooth blend near sigma=1 to avoid numerical noise from the 1/rho exponent
    if (Math.abs(rho) < 0.05) {
      const blend = Math.abs(rho) / 0.05; // 0 at rho=0, 1 at |rho|=0.05
      const s_L_cd = 1 - alpha;
      Y_pot = Y_cd * (1 - blend) + Y_pot * blend;
      s_L = s_L_cd * (1 - blend) + s_L * blend;
    }
  }

  // TFP = Y_pot / f(K,L) — markup-free, used for the price index and as the
  // productivity reference for markup dynamics
  const tfp = Y_pot / Math.max(Math.pow(Kcap, alpha) * Math.pow(L, 1 - alpha), 1e-10);
  const productivity = tfp;

  // Markup with pass-through dynamics. The static Cournot level muBase is the
  // STARTING markup; what happens to productivity gains is then governed by
  // competition:  mu_t = muBase · (Z_t/Z_0)^(1/N).
  // N=1: the price never falls — every cost decline accrues as profit. Large N:
  // rivals force gains through to prices and the markup stays at its Cournot
  // level. zRef is period-0 TFP (null at period 0 itself → mu = muBase).
  const muBase = (N * DEMAND_EPS) / Math.max(N * DEMAND_EPS - 1, 0.01);
  const zRatio = zRef ? Math.max(tfp / zRef, 1e-10) : 1;
  const mu = Math.max(muBase * Math.pow(zRatio, 1 / N), 1.0001);

  const Y = Y_pot / Math.pow(mu, DWL_EXP);
  const laborShare = s_L / mu;
  const wagePool = laborShare * Y;
  const capitalPool = (1 - laborShare) * Y;
  const wagePer = wagePool / N_DECILES;
  const meanY = Y / N_DECILES;

  const pretax = kFracs.map(f => wagePer + capitalPool * f);
  const posttax = pretax.map(y => (1 - t) * y + t * meanY);

  // Price: markup × unit cost, where unit cost ∝ 1/TFP
  const priceRaw = mu / Math.max(tfp, 1e-10);

  return { Y, mu, laborShare, L, wagePool, capitalPool, pretax, posttax, priceRaw, meanY, productivity };
}

// ── Dynamic simulation ──

export function simulate({ alphaTarget, sigma, N, t, theta, gA, savingsSpread, gamma, transferMode = "indexed" }) {
  // Initial capital distribution
  const kRaw0 = Array.from({ length: N_DECILES }, (_, i) => Math.pow(i + 1, theta));
  const kSum0 = kRaw0.reduce((a, b) => a + b, 0);
  let kAbs = kRaw0.map(k => (k / kSum0) * K_0);

  // Savings rate by decile: the spread tilts AROUND the base rate, centered on
  // the middle of the distribution and floored at zero:
  //   s_i = max( S_BASE · (1 + spread · (rank − 5.5)/4.5), 0 )
  // spread=0: everyone saves S_BASE. spread≥1: the bottom decile saves nothing
  // (hand-to-mouth, matching the data) while the top saves S_BASE·(1+spread).
  // The earlier form (base × (1 + spread·rank/10)) had even the poorest decile
  // saving 12%+, which let it accumulate a micro-stake in the capital pool and
  // ride monopoly rents to implausible gains in the dystopia scenarios.
  // No cap: the old 40% cap was a band-aid for the explosive accumulation that
  // the physical bottleneck (gamma) now controls.
  const savingsRates = Array.from({ length: N_DECILES }, (_, i) =>
    Math.max(S_BASE * (1 + savingsSpread * ((i + 1) - 5.5) / 4.5), 0)
  );

  const history = [];
  let z0 = null;      // period-0 TFP: reference for markup pass-through dynamics
  let p0raw = null;   // period-0 price level: reference for the nominal-fixed UBI
  let B_flat = 0;     // flat-UBI NOMINAL amount per decile, set from the period-0 equilibrium
  let tauPrev = t;

  for (let tp = 0; tp <= T_PERIODS; tp++) {
    // Logistic automation path
    const logArg = 0.25 * (tp - T_PERIODS * 0.4);
    const frac = 1 / (1 + Math.exp(-logArg));
    const alpha_t = ALPHA_0 + (alphaTarget - ALPHA_0) * frac;
    const A_t = A_0 * Math.pow(1 + gA, tp);
    const K_total = kAbs.reduce((a, b) => a + b, 0);
    const kFracs = kAbs.map(k => k / Math.max(K_total, 1e-10));

    // Transfer rate. Indexed (NIT): constant rate t, so the per-person transfer
    // t·ȳ rides mean income. Flat UBI: fixed NOMINAL amount, calibrated so it
    // equals the NIT transfer at period 0. Its real value is B_flat·(P_0/P_t) —
    // it buys more only as prices actually fall, which is what competition's
    // pass-through controls. Funded each period by the budget-balancing rate
    // τ = 10·B_real/Y (capped). Since τ·ȳ = B_real, the NIT formula evaluated
    // at τ IS the flat UBI — the modes coincide at period 0 and diverge only
    // through indexation. τ feeds back on labor supply and hence Y, so solve
    // the small τ→Y→τ fixed point.
    let tau = t;
    if (transferMode === "flat" && tp > 0) {
      tau = tauPrev;
      for (let it = 0; it < 8; it++) {
        const e = equilibrium(alpha_t, sigma, N, tau, A_t, K_total, kFracs, gamma, z0);
        const B_real = B_flat * (p0raw / Math.max(e.priceRaw, 1e-10));
        tau = Math.min(N_DECILES * B_real / Math.max(e.Y, 1e-10), 0.95);
      }
    }

    const eq = equilibrium(alpha_t, sigma, N, tau, A_t, K_total, kFracs, gamma, z0);
    if (tp === 0) {
      z0 = eq.productivity;
      p0raw = eq.priceRaw;
      B_flat = t * eq.Y / N_DECILES;
    }
    tauPrev = tau;

    const rec = {
      period: tp,
      alpha: alpha_t,
      A: A_t,
      K: K_total,
      tau,
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
  //   priceActual = μ_t · priceComp     — actual markup-inclusive price
  // The gap between them is the productivity gain captured as profit instead of
  // passed to consumers as lower prices. With pass-through dynamics the gap
  // WIDENS over time under market power (μ_t grows as gains are kept as profit)
  // and stays at the small Cournot wedge under competition.
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

// Each decile's real purchasing power at the end of the simulation as a
// multiple of its OWN pre-AGI (period 0) level. One-good economy: real
// purchasing power is post-tax income, so the multiple is the income ratio.
export function purchasingPowerMultiples(history) {
  const h0 = history[0], hT = history[history.length - 1];
  return h0.posttax.map((y0, i) => hT.posttax[i] / Math.max(y0, 1e-10));
}

// ── Presets ──

// The four AI presets form a clean 2×2 around two policy levers, all sharing
// the same technology/capital parameters: Dystopia = monopoly + no transfers;
// Redistribution Only = Dystopia + a fixed (flat) UBI; Competition Only =
// Dystopia + competition; Utopia = both levers combined.
export const PRESETS = [
  { id: "base", label: "Today's Trajectory", icon: "◉",
    alphaTarget: 0.50, sigma: 1.0, N: 12, t: 0.10, theta: 2.5, gA: 0.02, savingsSpread: 1.5, gamma: 0.90, transferMode: "indexed" },
  { id: "dys",  label: "AI Dystopia",       icon: "▼",
    alphaTarget: 0.90, sigma: 1.8, N: 1,  t: 0.00, theta: 3.5, gA: 0.08, savingsSpread: 2.5, gamma: 0.90, transferMode: "flat" },
  { id: "uto",  label: "AI Utopia",         icon: "▲",
    alphaTarget: 0.90, sigma: 1.8, N: 30, t: 0.40, theta: 3.5, gA: 0.08, savingsSpread: 2.5, gamma: 0.90, transferMode: "flat" },
  { id: "ubi",  label: "Redistribution Only", icon: "◐",
    alphaTarget: 0.90, sigma: 1.8, N: 1,  t: 0.40, theta: 3.5, gA: 0.08, savingsSpread: 2.5, gamma: 0.90, transferMode: "flat" },
  { id: "comp", label: "Competition Only",  icon: "◑",
    alphaTarget: 0.90, sigma: 1.8, N: 30, t: 0.00, theta: 3.5, gA: 0.08, savingsSpread: 2.5, gamma: 0.90, transferMode: "flat" },
];

export const DEFAULT_PRESET = PRESETS[0];
