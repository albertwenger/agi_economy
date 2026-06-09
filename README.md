# The AGI Economy: A General Equilibrium Model

An interactive general equilibrium model exploring how automation, market structure, and redistribution policy shape economic outcomes in an AI-driven economy.

**[Try the live model →](https://albertwenger.github.io/agi_economy/)**

**[Read the blog post →](https://continuations.com/modeling-the-agi-economy)**

## The Question

Will advanced AI create broadly shared prosperity or extreme wealth concentration? The answer depends on policy. This model lets you explore how two levers — market competition and redistribution — interact with automation to produce radically different outcomes.

## Model Architecture

The model combines four building blocks, each grounded in the academic literature:

### 1. Production (CES Task Framework)

Following [Acemoglu & Restrepo (2022)](https://ideas.repec.org/a/wly/emetrp/v90y2022i5p1973-2016.html), output is produced by combining automated and labor tasks via a CES aggregator:

```
Y = [α^(1/σ) · (A·K^γ)^ρ + (1−α)^(1/σ) · L^ρ]^(1/ρ) / μ^0.7
```

- **α** — share of tasks automated by AI-capital
- **A** — AI productivity (compounds over time at rate g_A)
- **σ** — elasticity of substitution between capital and labor
- **ρ = (σ−1)/σ**
- **γ** — physical bottleneck: returns-to-scale on accumulated capital

The automation share α ramps logistically from 30% toward a user-specified target over the simulation horizon, capturing gradual AI diffusion.

A subtlety of this share-weight normalization: as σ→1 the aggregator converges not to plain Cobb-Douglas but to `e^(H(α)) · (A·K^γ)^α · L^(1−α)`, where `H(α) = −α·ln α − (1−α)·ln(1−α)` is the entropy of the task shares. The code implements this limit explicitly so that output is smooth in σ (an earlier version used the plain Cobb-Douglas form, which produced an artificial output dip at exactly σ=1).

**Physical bottleneck (γ).** Capital enters as `K^γ` rather than `K`. With γ=1 and σ>1 the model is an AK economy — capital and labor are gross substitutes with no diminishing returns, so accumulation has no balanced growth path (Uzawa's theorem) and output, capital, and real incomes diverge super-exponentially toward a finite-time singularity. Setting γ<1 represents a fixed complementary factor that AI cannot accumulate its way around — energy, compute, land, raw materials — which restores a stationary capital–output ratio and keeps the economy on a balanced growth path for any σ. Lower γ means a tighter physical constraint; γ=1 reproduces the unbounded "singularity" regime. The default is γ=0.90.

### 2. Market Power (Cournot + Pass-Through)

N symmetric firms compete with demand elasticity ε=2, setting the *starting* markup:

```
μ₀ = Nε / (Nε − 1)
```

Competition then determines what happens to productivity gains over time. The markup evolves as

```
μ_t = μ₀ · (Z_t / Z_0)^(1/N)
```

where Z is productivity. Under monopoly (N=1) the exponent is 1: the price never falls — every cost decline accrues as profit, and the markup compounds with productivity. With many firms the exponent → 0: rivals force the gains through to prices and the markup stays pinned near its Cournot level. This makes the core policy insight literal rather than rhetorical: **without competition, instead of prices falling, profits rise** — under high market power the consumer price stays where it started while marginal cost collapses underneath it.

The markup compresses the effective labor share (workers receive s_L/μ of output) and creates deadweight loss (Y_actual = Y_potential / μ^0.7), which now *grows* under market power as μ_t compounds — concentrated markets choke output, not just redistribute it. Monopoly rents (1 − 1/μ)·Y flow to capital owners proportional to their capital holdings. N is treated as exogenous because it is subject to policy (antitrust, regulation, open standards); the pass-through exponent 1/N is a reduced form for how rivalry disciplines pricing.

### 3. Capital Dynamics (Heterogeneous Agents)

Inspired by [Moll, Rachel & Restrepo (2022)](https://benjaminmoll.com/wp-content/uploads/2019/07/UG.pdf), ten household deciles hold unequal capital stocks:

```
k_i ∝ i^θ          (initial distribution, θ controls concentration)
k_{i,t+1} = (1−δ)·k_{i,t} + s_i · y_net_{i,t}            (accumulation, δ=0.05)
s_i = max( s_base · (1 + spread·(i − 5.5)/4.5), 0 )        (differential savings; s_base = 0.12)
```

Capital depreciates at δ=5% per period. The savings spread tilts savings rates *around* the 12% base, centered on the middle of the distribution: richer households save more, poorer households save less, and at spread ≥ 1 the bottom decile saves nothing — hand-to-mouth, as in the data. Capital ownership therefore concentrates endogenously over time — the Piketty r > g mechanism emerges from the model rather than being assumed — and the bottom deciles' living standards ride wages and transfers alone, with no rescue from a micro-stake in the capital pool (an earlier symmetric-savings form had even the poorest decile saving 12%+, which let it ride monopoly rents to implausible gains in the dystopia scenarios). The physical bottleneck γ keeps the capital–output ratio stationary so concentration is bounded rather than runaway. (Earlier versions also capped savings rates at 40%; γ now handles stability, so the cap was removed.)

### 4. Negative Income Tax / UBI

Budget-balanced redistribution:

```
y_net = (1−t)·y + t·ȳ
```

Below-mean earners receive transfers; above-mean earners pay. Labor supply responds to both the tax rate (elasticity λ=0.25) and the automation share (as more tasks are automated, effective wages fall, reducing labor supply). This captures the compound effect of high automation + high redistribution on labor participation.

**Transfer indexation.** The benefit side of the NIT is already a flat per-person amount within each period (everyone receives t·ȳ); what distinguishes policies is how that amount evolves. The model offers two modes:

- **Indexed (NIT, default)** — the rate t is constant, so the transfer t·ȳ grows with mean income: a fixed *share* of the economy.
- **Flat UBI** — the transfer is fixed in *money* terms, calibrated to equal the NIT transfer at period 0. Its real value is B·(P₀/P_t): it buys more only as prices actually fall. Funded each period by the budget-balancing rate τ.

The two modes coincide at period 0 and diverge only through indexation — and the flat UBI's fate then hinges entirely on competition, via pass-through. Under market power prices never fall, so the flat UBI buys the same basket forever while the owners of capital pull away. Under competition, collapsing prices do the indexing for free: the same fixed payment rides deflation to many times its original purchasing power. A flat UBI is a bet on competition; only the indexed transfer (a fixed share of the economy) compresses *relative* inequality, since even a deflation-riding UBI grows with productivity while mean income grows with productivity *and* capital accumulation.

### Prices and Real Purchasing Power

The model shows two price lines, both normalized so the competitive price is 1 at t=0:

```
P_competitive,t = 1 / Z_t          (marginal cost; what prices would be under competition)
P_actual,t      = μ_t · 1 / Z_t    (the markup-inclusive price people actually pay)
```

where Z_t is productivity. The competitive price always falls as productivity grows ("everything gets cheap"), but whether the *actual* price follows it down is decided by pass-through: under competition the two lines fall together a thin wedge apart, while under market power the actual price stays roughly flat as μ_t compounds — the **widening gap between the lines is the productivity gain captured as profit rather than passed to consumers**.

Real purchasing power is **not** computed by deflating income by this price index. In a one-good economy each decile's real consumption is simply its share of real output, so post-tax income already *is* real purchasing power — deflating it again would double-count productivity. Competition raises everyone's real income through two channels instead: a larger real pie (the deadweight loss compounds with the markup, so low pass-through chokes output growth itself) and a smaller share of output diverted to monopoly rents. The exception is the flat UBI, which is fixed in money terms — its real value is computed off the actual price level, which is what makes it competition-dependent.

## Parameters

| Parameter | Symbol | Range | Description |
|-----------|--------|-------|-------------|
| Target Automation | α | 0.30–0.95 | Long-run share of tasks performed by AI-capital |
| Substitutability | σ | 0.3–3.0 | σ>1: easy to replace labor; σ<1: labor is bottleneck |
| AI Productivity Growth | g_A | 0–15%/yr | Compound growth rate of AI capability |
| Physical Bottleneck | γ | 0.5–1.0 | Returns to accumulated capital. γ=1: no limit (AK singularity); γ<1: tighter energy/compute/land constraint |
| Competing Firms | N | 1–50 | Market structure and pass-through: 1=monopoly (prices never fall), 50≈perfect competition (gains go to prices) |
| NIT/UBI Rate | t | 0–60% | Transfer generosity (share of mean income at period 0) |
| Transfer Mode | — | indexed / flat | Indexed: transfer = t·ȳ forever. Flat: UBI fixed in money terms at the period-0 level — buys more only as prices fall (i.e. only with competition) |
| Wealth Concentration | θ | 0–5 | Initial capital distribution skewness |
| Savings Spread | — | 0–3 | Tilts savings rates around the 12% base: rich save more, poor save less; at ≥1 the bottom decile saves nothing |

## Scenarios

The four AI presets form a clean 2×2 around the two policy levers — market structure (N) and a fixed (flat) UBI — holding all technology and capital parameters equal:

| Preset | α | σ | N | Transfer | Key Outcome |
|--------|---|---|---|----------|-------------|
| **Today's Trajectory** | 50% | 1.0 | 12 | 10% indexed | Moderate growth, slowly rising inequality |
| **AI Dystopia** | 90% | 1.8 | 1 | none | Monopoly: prices never fall, every productivity gain becomes profit. Wages collapse, the bottom decile owns no capital — it ends *absolutely poorer* than pre-AGI (≈×0.2) while the top gains thousands-fold |
| **Redistribution Only** | 90% | 1.8 | 1 | 40% flat UBI | The fixed payment buys the same basket forever — monopoly keeps prices from falling, so the floor holds the bottom near pre-AGI subsistence but no higher |
| **Competition Only** | 90% | 1.8 | 30 | none | Prices collapse ~50×; even the bottom decile reaches thousands of times its pre-AGI purchasing power — but gains are wildly skewed and rest entirely on residual wages |
| **AI Utopia** | 90% | 1.8 | 30 | 40% flat UBI | The same fixed UBI now rides deflation: competition is what makes a modest flat transfer a claim on ever-growing abundance, on top of a guaranteed floor wages can't provide |

## Key Finding

**A flat UBI is a bet on competition.** The transfer's nominal level matters far less than whether prices fall — and whether prices fall is a policy choice about market structure.

- *Monopoly with no redistribution* (Dystopia) is absolute, not just relative, failure: prices never fall, so productivity gains reach no one but capital owners — the bottom decile, its wages automated away and owning no capital, ends poorer than it started.
- *A fixed UBI under monopoly* (Redistribution Only) freezes the bottom at its starting basket: a fixed payment facing fixed prices buys the same goods forever, while the owners of capital pull away.
- *Competition without transfers* (Competition Only) delivers astonishing absolute gains through deflation, but the bottom decile's claim on them rests on residual wages — fragile as automation deepens — and relative inequality stays extreme.
- *The combination* (Utopia) gives the bottom decile both a guaranteed claim and a reason for that claim to grow: the same fixed payment buys ~50× more as competition forces prices toward collapsing marginal cost.

One honest nuance the model surfaces: with vigorous competition, the *terminal* difference between Utopia and Competition Only is small — deflation does most of the work, and the flat UBI mainly provides the floor and the transition insurance. What a flat UBI cannot do, even with competition, is compress *relative* inequality (Gini stays ≈0.8): everyone gets radically richer, but capital owners get richer faster. Compressing shares requires the indexed NIT (a fixed share of mean income rather than a fixed payment), available via the transfer-mode toggle.

## Academic References

The model synthesizes ideas from several strands of the literature:

- **Acemoglu, D. & Restrepo, P.** (2022). "Tasks, Automation, and the Rise in U.S. Wage Inequality." *Econometrica*, 90(5), 1973–2016. — Task-based production framework.

- **Moll, B., Rachel, L. & Restrepo, P.** (2022). "Uneven Growth: Automation's Impact on Income and Wealth Inequality." — Heterogeneous-agent model linking automation to wealth concentration via returns to capital.

- **Korinek, A. & Stiglitz, J.E.** (2019). "Artificial Intelligence and Its Implications for Income Distribution and Unemployment." In *The Economics of Artificial Intelligence*, pp. 349–390. NBER/University of Chicago Press. — Taxonomy of AI's distributional channels; role of antitrust and redistribution.

- **Saint-Paul, G.** (2025). "Artificial Intelligence, the Collapse of Consumer Society, and Oligarchy." IZA Discussion Paper No. 17682. — Oligarch model with UBI vs. Post-Fordism policy choice.

- **Aghion, P., Jones, B.F. & Jones, C.I.** (2019). "Artificial Intelligence and Economic Growth." In *The Economics of Artificial Intelligence*. NBER/University of Chicago Press. — AI, Baumol's cost disease, and singularity conditions.

- **Trammell, P. & Korinek, A.** (2024). "Economic Growth under Transformative AI." NBER Working Paper 31815. — Comprehensive survey of growth, wages, and labor share under transformative AI scenarios.

- **Lopes, J.** (2024). "The Macroeconomic Effects of Universal Basic Income Programs." *Journal of Monetary Economics*. — OLG general equilibrium model of UBI with heterogeneous agents.

- **Barkan, C.** (2024). "Can an Increase in Productivity Cause a Decrease in Production?" — Shows AI productivity gains can reduce output under imperfect competition.

- **IMF Staff** (2025). "AI Adoption and Inequality." WP/25/68. — Task-based model calibrated to UK, building on Moll et al.

## Limitations and Extensions

This is a first-cut model for building intuition, not a calibrated forecasting tool. Known limitations and potential extensions include:

- **Flat tax, no evasion**: The NIT taxes all income uniformly and assumes full compliance. Progressive rates, differential treatment of capital vs. labor income, and capital's greater ability to avoid taxation (offshore structuring, tokenized/digital assets) would better capture real policy options and would tend to amplify inequality beyond what the model shows.
- **σ-isolated labor supply**: Labor supply responds to the tax rate (elasticity λ=0.25) and to a proxy for automation `(1−α)`, but not to the *realized* equilibrium wage, which embeds the substitutability σ. As a result, high substitutability and high redistribution do not compound on labor supply as strongly as a fully wage-responsive labor-supply curve (solving the wage↔labor fixed point) would imply.
- **Reduced-form deadweight loss**: The output cost of market power is the ad-hoc wedge `Y/μ^0.7` rather than being derived from the demand system and Cournot quantities. The exponent is a calibration choice — large enough that monopoly meaningfully shrinks the real pie — but the true mapping from concentration to output loss would follow from an explicit demand curve.
- **Reduced-form pass-through**: The markup dynamics `μ_t = μ₀·(Z_t/Z_0)^(1/N)` impose that a monopolist keeps all productivity gains as profit and a perfectly competitive market keeps none, with `1/N` interpolating between them. A structural treatment would derive pass-through from demand curvature, entry threats, and the durability of the technology lead; a profit-maximizing monopolist facing isoelastic demand would not literally hold prices fixed forever.
- **No capital ownership broadening**: Sovereign wealth funds, stakeholder ownership, and broad-based equity participation are arguably a third policy dimension not yet modeled.
- **Exogenous market structure**: AI may itself drive concentration through economies of scale in training and data. Endogenizing N as a function of AI capability would capture this self-reinforcing dynamic.
- **Aggregate, not sectoral, bottleneck**: The physical bottleneck γ imposes economy-wide diminishing returns to capital, but the model still doesn't capture *sector-level* heterogeneity in automation difficulty (the full Baumol / Aghion-Jones-Jones mechanism, where slow-to-automate sectors come to dominate value added).
- **Stylized savings**: A richer household optimization problem (consumption-savings with borrowing constraints) would replace the fixed savings rates.
- **No international dimension**: Trade and cross-border capital flows matter for how AI's distributional effects play out globally.

Contributions addressing any of these are welcome.

## Code Layout and Tests

The model logic is separated from the UI so it can be exercised programmatically:

- **`src/model.js`** — the pure model: constants, `equilibrium()` (single-period CES production, Cournot + pass-through markup, NIT), `simulate()` (the 40-period dynamic path with both transfer modes), `gini()`, `purchasingPowerMultiples()`, and the scenario presets. No UI dependencies; runs in plain Node.
- **`agi_economy_dynamic.jsx`** — the interactive React UI, which imports the model.
- **`tests/model.test.mjs`** — the test harness, using Node's built-in test runner (no extra dependencies). It checks accounting identities (incomes exhaust output, budget-balanced transfers under both modes, price-line consistency), comparative statics (markup and pass-through vs N, labor share vs α, γ bounds accumulation, redistribution slows capital concentration), and the headline results: monopoly freezes prices while competition forces them to cost, a flat UBI works only under competition, and the preset 2×2 (from the immiserated bottom decile in Dystopia to abundance in Utopia).

Run the tests with:

```
npm test        # = node --test tests/*.test.mjs
```

CI runs the tests before every deploy. To probe the model interactively, import it directly:

```js
import { simulate, PRESETS } from "./src/model.js";
// AI Dystopia, but with a 20% indexed NIT layered on
const history = simulate({ ...PRESETS[1], t: 0.2, transferMode: "indexed" });
console.log(history[40].giniPost);
```

## Contributing

This model is meant to be extended, challenged, and improved. If you have ideas:

1. **Fork the repo** and implement your extension
2. **Open an issue** to discuss proposed changes or flag problems with the assumptions
3. **Submit a pull request** with your additions

Particularly welcome: alternative market structure models, richer household optimization, progressive tax schedules, endogenous firm entry/exit, and calibration to real-world data.

## License

MIT

## Authors

[Albert Wenger](https://continuations.com) and [Claude](https://claude.ai) (Anthropic)
