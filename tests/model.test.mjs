// Test harness for the AGI economy model (src/model.js).
// Runs with Node's built-in test runner — no dependencies:
//   npm test   (= node --test tests/)
//
// The tests check three kinds of properties:
//   1. Accounting identities that must hold in any period
//   2. Comparative statics the mechanisms are supposed to produce
//   3. The headline thesis: competition sets the size of the pie,
//      redistribution sets who shares it

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEMAND_EPS, T_PERIODS, N_DECILES, K_0,
  gini, equilibrium, simulate, PRESETS,
} from "../src/model.js";

const equalFracs = Array(N_DECILES).fill(1 / N_DECILES);
const approx = (a, b, rel = 1e-9) =>
  assert.ok(Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b), 1),
    `expected ${a} ≈ ${b}`);

// A concentrated capital distribution for single-period tests: k_i ∝ i^3
const skewedFracs = (() => {
  const raw = Array.from({ length: N_DECILES }, (_, i) => Math.pow(i + 1, 3));
  const s = raw.reduce((a, b) => a + b, 0);
  return raw.map(k => k / s);
})();

// ── Gini ──

test("gini: 0 for equal incomes, → (n−1)/n for total concentration, in [0,1]", () => {
  assert.equal(gini(Array(10).fill(3)), 0);
  approx(gini([0, 0, 0, 0, 0, 0, 0, 0, 0, 1]), 0.9);
  const g = gini([1, 2, 3, 5, 8, 13, 21, 34, 55, 89]);
  assert.ok(g > 0 && g < 1);
});

// ── Single-period equilibrium: identities ──

test("equilibrium: incomes exhaust output (Σ pretax = Σ posttax = Y)", () => {
  for (const t of [0, 0.25, 0.6]) {
    const eq = equilibrium(0.7, 1.8, 5, t, 2.0, 1.5, skewedFracs, 0.9);
    const sum = a => a.reduce((x, y) => x + y, 0);
    approx(sum(eq.pretax), eq.Y);
    approx(sum(eq.posttax), eq.Y); // NIT is budget-balanced
    approx(eq.wagePool + eq.capitalPool, eq.Y);
  }
});

test("equilibrium: Cournot markup μ = Nε/(Nε−1)", () => {
  const mu = N => equilibrium(0.5, 1.5, N, 0, 1, 1, equalFracs, 0.9).mu;
  approx(mu(1), DEMAND_EPS / (DEMAND_EPS - 1)); // monopoly: 2 under ε=2
  assert.ok(mu(2) > mu(10) && mu(10) > mu(50)); // more firms → lower markup
  assert.ok(mu(50) < 1.02); // ≈ competitive
});

test("equilibrium: σ→1 limit is the entropy-corrected Cobb-Douglas form", () => {
  // With share weights α^(1/σ), lim_{σ→1} CES = e^{H(α)}·X^α·L^(1−α), where
  // H(α) = −α·ln α − (1−α)·ln(1−α). The plain CD form (no e^H factor) made
  // output dip artificially at σ=1.
  const alpha = 0.6, A = 1.5, K = 1.2, gamma = 0.9, t = 0.1;
  const eq = equilibrium(alpha, 1.0, 10, t, A, K, skewedFracs, gamma);
  const H = -alpha * Math.log(alpha) - (1 - alpha) * Math.log(1 - alpha);
  const L = (1 - 0.25 * t) * Math.pow(1 - alpha, 0.3);
  const Y_pot = Math.exp(H) * Math.pow(A * Math.pow(K, gamma), alpha) * Math.pow(L, 1 - alpha);
  approx(eq.Y, Y_pot / Math.pow(eq.mu, 0.7), 1e-9);
  approx(eq.laborShare, (1 - alpha) / eq.mu, 1e-9);
});

test("equilibrium: Y is smooth in σ across the Cobb-Douglas blend (no dip at σ=1)", () => {
  const Y = sigma => equilibrium(0.6, sigma, 10, 0.1, 1.5, 1.2, skewedFracs, 0.9).Y;
  // The blend spans |ρ| < 0.05, i.e. σ ∈ (0.9524, 1.0526). With the entropy-
  // corrected CD limit the whole neighborhood of σ=1 should be flat to ~1%.
  const grid = [0.94, 0.9525, 0.98, 0.999, 1.0, 1.001, 1.02, 1.0526, 1.06].map(Y);
  const [lo, hi] = [Math.min(...grid), Math.max(...grid)];
  assert.ok(hi / lo < 1.01, `Y should be near-flat across σ≈1, got spread ${(hi / lo - 1) * 100}%`);
});

test("equilibrium: labor share falls with automation α (σ > 1)", () => {
  const ls = alpha => equilibrium(alpha, 1.8, 10, 0, 1, 1, equalFracs, 0.9).laborShare;
  assert.ok(ls(0.3) > ls(0.6) && ls(0.6) > ls(0.9));
});

test("equilibrium: market power shrinks the pie and the labor share", () => {
  const mono = equilibrium(0.6, 1.5, 1, 0, 1, 1, equalFracs, 0.9);
  const comp = equilibrium(0.6, 1.5, 50, 0, 1, 1, equalFracs, 0.9);
  assert.ok(mono.Y < comp.Y, "deadweight loss: monopoly output below competitive");
  assert.ok(mono.laborShare < comp.laborShare, "markup compresses labor share");
});

test("equilibrium: redistribution compresses the income distribution", () => {
  const none = equilibrium(0.7, 1.8, 5, 0, 1, 1, skewedFracs, 0.9);
  const nit = equilibrium(0.7, 1.8, 5, 0.4, 1, 1, skewedFracs, 0.9);
  assert.ok(gini(nit.posttax) < gini(none.posttax));
  assert.ok(nit.posttax[0] > none.posttax[0], "bottom decile gains from NIT");
  assert.ok(nit.posttax[9] < none.posttax[9], "top decile pays for NIT");
});

// ── Dynamic simulation: sanity across all presets ──

test("simulate: every preset stays finite and positive over the full horizon", () => {
  for (const p of PRESETS) {
    const hist = simulate(p);
    assert.equal(hist.length, T_PERIODS + 1);
    for (const h of hist) {
      for (const key of ["Y", "K", "price", "priceComp", "d1Real", "d10Real", "laborShare"]) {
        assert.ok(Number.isFinite(h[key]) && h[key] > 0,
          `${p.label}, period ${h.period}: ${key} = ${h[key]}`);
      }
      assert.ok(h.giniPost >= 0 && h.giniPost <= 1);
      assert.ok(h.giniPost <= h.giniPre + 1e-12, "NIT never increases inequality");
    }
  }
});

test("simulate: initial conditions (K = K_0, competitive price = 1, α = ramp start)", () => {
  const h0 = simulate(PRESETS[0])[0];
  approx(h0.K, K_0);
  approx(h0.priceComp, 1);
  approx(h0.priceActual, h0.mu);
  assert.ok(h0.alpha > 0.30 && h0.alpha < 0.40, "logistic ramp starts near α₀=0.30");
});

test("simulate: price lines obey priceActual = μ · priceComp and fall with productivity growth", () => {
  for (const p of PRESETS) {
    const hist = simulate(p);
    for (const h of hist) approx(h.priceActual, h.mu * h.priceComp);
    if (p.gA > 0) {
      const [h0, hT] = [hist[0], hist[T_PERIODS]];
      assert.ok(hT.priceComp < h0.priceComp, `${p.label}: prices fall as productivity grows`);
    }
  }
});

test("simulate: physical bottleneck γ caps accumulation (lower γ → less capital)", () => {
  const base = { alphaTarget: 0.9, sigma: 1.8, N: 10, t: 0.1, theta: 3, gA: 0.08, savingsSpread: 2 };
  const K_T = gamma => simulate({ ...base, gamma })[T_PERIODS].K;
  assert.ok(K_T(0.7) < K_T(0.9), "tighter bottleneck → smaller capital stock");
  assert.ok(Number.isFinite(K_T(0.9)));
});

test("simulate: differential savings concentrate capital; redistribution counteracts it", () => {
  const base = { alphaTarget: 0.9, sigma: 1.8, N: 2, theta: 3.5, gA: 0.08, savingsSpread: 2.5, gamma: 0.9 };
  const noTax = simulate({ ...base, t: 0 });
  const tax = simulate({ ...base, t: 0.4 });
  const topShare = hist => hist[T_PERIODS].kFracs[9];
  assert.ok(topShare(noTax) > noTax[0].kFracs[9], "top decile capital share rises (r > g)");
  assert.ok(topShare(tax) < topShare(noTax), "NIT slows differential accumulation");
});

// ── The thesis: 2×2 policy grid ──

test("thesis 2×2: competition sets the size of the pie, redistribution sets who shares it", () => {
  const cfg = { alphaTarget: 0.90, sigma: 1.8, theta: 3.5, gA: 0.08, savingsSpread: 2.5, gamma: 0.90 };
  const at = (N, t) => simulate({ ...cfg, N, t })[T_PERIODS];

  const dystopia = at(2, 0);       // low competition, no redistribution
  const compOnly = at(30, 0);
  const ubiOnly = at(2, 0.4);
  const both = at(30, 0.4);

  // Redistribution, not competition, is what compresses inequality
  assert.ok(ubiOnly.giniPost < dystopia.giniPost - 0.3);
  assert.ok(both.giniPost < compOnly.giniPost - 0.3);
  assert.ok(Math.abs(compOnly.giniPost - dystopia.giniPost) < 0.05,
    "competition alone barely moves the Gini");

  // Competition grows the pie (total output) at any tax rate
  assert.ok(compOnly.Y > dystopia.Y);
  assert.ok(both.Y > ubiOnly.Y);

  // For the bottom decile, each lever helps and the combination dominates
  assert.ok(ubiOnly.d1Real > dystopia.d1Real);
  assert.ok(both.d1Real > 2 * ubiOnly.d1Real,
    "adding competition to redistribution multiplies bottom-decile real income");
  assert.ok(both.d1Real > compOnly.d1Real && both.d1Real > ubiOnly.d1Real);

  // Without redistribution the bottom decile is excluded from the abundance
  assert.ok(compOnly.d10Real / compOnly.d1Real > 100,
    "competition-only leaves extreme top/bottom gaps");
});
