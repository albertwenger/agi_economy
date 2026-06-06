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
Y = [α^(1/σ) · (A·K^γ)^ρ + (1−α)^(1/σ) · L^ρ]^(1/ρ) / μ^0.1
```

- **α** — share of tasks automated by AI-capital
- **A** — AI productivity (compounds over time at rate g_A)
- **σ** — elasticity of substitution between capital and labor
- **ρ = (σ−1)/σ**
- **γ** — physical bottleneck: returns-to-scale on accumulated capital

The automation share α ramps logistically from 30% toward a user-specified target over the simulation horizon, capturing gradual AI diffusion.

**Physical bottleneck (γ).** Capital enters as `K^γ` rather than `K`. With γ=1 and σ>1 the model is an AK economy — capital and labor are gross substitutes with no diminishing returns, so accumulation has no balanced growth path (Uzawa's theorem) and output, capital, and real incomes diverge super-exponentially toward a finite-time singularity. Setting γ<1 represents a fixed complementary factor that AI cannot accumulate its way around — energy, compute, land, raw materials — which restores a stationary capital–output ratio and keeps the economy on a balanced growth path for any σ. Lower γ means a tighter physical constraint; γ=1 reproduces the unbounded "singularity" regime. The default is γ=0.90.

### 2. Market Power (Cournot Competition)

N symmetric firms compete with demand elasticity ε=2, yielding markup:

```
μ = Nε / (Nε − 1)
```

The markup compresses the effective labor share (workers receive s_L/μ of output) and creates deadweight loss (Y_actual = Y_potential / μ^0.7). Monopoly rents (1 − 1/μ)·Y flow to capital owners proportional to their capital holdings.

This captures the core policy insight: **without competition, instead of prices falling, profits rise.** A given productivity gain shows up as a falling unit cost; the markup decides whether that saving reaches consumers as a lower price (competition, μ→1) or is captured as profit that accrues to concentrated capital ownership (monopoly). The deadweight-loss exponent of 0.7 means monopoly also meaningfully shrinks the real pie — so competition does double duty: it both passes gains to consumers *and* makes the total output larger. N is treated as exogenous because it is subject to policy (antitrust, regulation, open standards).

### 3. Capital Dynamics (Heterogeneous Agents)

Inspired by [Moll, Rachel & Restrepo (2022)](https://benjaminmoll.com/wp-content/uploads/2019/07/UG.pdf), ten household deciles hold unequal capital stocks:

```
k_i ∝ i^θ          (initial distribution, θ controls concentration)
k_{i,t+1} = (1−δ)·k_{i,t} + s_i · y_net_{i,t}    (accumulation, δ=0.05)
s_i = s_base · (1 + spread · i/10)                  (differential savings; s_base = 0.12)
```

Capital depreciates at δ=5% per period. Richer households save a larger fraction of income, so capital ownership concentrates endogenously over time — the Piketty r > g mechanism emerges from the model rather than being assumed. Because accumulation is financed out of (post-tax) income, redistribution directly compresses the differential capital build-up, while the physical bottleneck γ keeps the capital–output ratio stationary so concentration is bounded rather than runaway. (Earlier versions capped savings rates at 40% to prevent runaway accumulation; γ now handles stability, so the cap was removed — it had been suppressing the very concentration the high-inequality scenarios are meant to show.)

### 4. Negative Income Tax / UBI

Budget-balanced redistribution:

```
y_net = (1−t)·y + t·ȳ
```

Below-mean earners receive transfers; above-mean earners pay. Labor supply responds to both the tax rate (elasticity λ=0.25) and the automation share (as more tasks are automated, effective wages fall, reducing labor supply). This captures the compound effect of high automation + high redistribution on labor participation.

### Prices and Real Purchasing Power

The model shows two price lines, both normalized so the competitive price is 1 at t=0:

```
P_competitive,t = 1 / Z_t          (marginal cost; what prices would be under competition)
P_actual,t      = μ · 1 / Z_t      (the markup-inclusive price people actually pay)
```

where Z_t is productivity. Both fall as productivity grows ("everything gets cheap"), but the **gap between them is the productivity gain captured as profit rather than passed to consumers** — it widens with the markup and vanishes under competition. (On a log axis the two lines sit a constant distance μ apart.)

Real purchasing power is **not** computed by deflating income by this price index. In a one-good economy each decile's real consumption is simply its share of real output, so post-tax income already *is* real purchasing power — deflating it again would double-count productivity. Competition raises everyone's real income through two channels instead: a larger real pie (less deadweight loss) and a smaller share of output diverted to monopoly rents.

## Parameters

| Parameter | Symbol | Range | Description |
|-----------|--------|-------|-------------|
| Target Automation | α | 0.30–0.95 | Long-run share of tasks performed by AI-capital |
| Substitutability | σ | 0.3–3.0 | σ>1: easy to replace labor; σ<1: labor is bottleneck |
| AI Productivity Growth | g_A | 0–15%/yr | Compound growth rate of AI capability |
| Physical Bottleneck | γ | 0.5–1.0 | Returns to accumulated capital. γ=1: no limit (AK singularity); γ<1: tighter energy/compute/land constraint |
| Competing Firms | N | 1–50 | Market structure: 1=monopoly, 50≈perfect competition |
| NIT/UBI Rate | t | 0–60% | Negative income tax rate |
| Wealth Concentration | θ | 0–5 | Initial capital distribution skewness |
| Savings Spread | — | 0–3 | How much more the rich save vs. the poor |

## Scenarios

Five presets illustrate the range of outcomes:

| Preset | α | σ | N | t | Key Outcome |
|--------|---|---|---|---|-------------|
| **Today's Trajectory** | 50% | 1.0 | 12 | 10% | Moderate growth, slowly rising inequality |
| **AI Dystopia** | 90% | 1.8 | 2 | 0% | Output soars but rents flow to capital; the bottom decile is left far behind |
| **AI Utopia** | 90% | 1.8 | 30 | 30% | Broadly shared prosperity — a large, cheap pie and a fair share of it |
| **Redistribution Only** | 90% | 1.8 | 2 | 40% | Inequality compressed, but the pie is shrunk and skimmed by monopoly rents |
| **Competition Only** | 90% | 1.8 | 30 | 0% | Bigger, cheaper pie, but the unwaged bottom decile is excluded from it |

## Key Finding

Neither competition nor redistribution alone is sufficient — they do different jobs, and you need both. **Competition sets the size of the pie; redistribution sets who shares it.**

- *Competition without redistribution* produces a large, cheap-goods economy, but a fully automated one in which displaced workers have no wage and little capital — they are excluded from the abundance. Inequality stays extreme.
- *Redistribution without competition* gives everyone a claim on output, but it is a claim on a pie that monopoly has shrunk (deadweight loss) and skimmed (rents to concentrated capital). The bottom decile's real income is a fraction of what it could be.
- *The combination* gives displaced workers both a share and a large pie to share: in the model, adding competition to a fully-redistributive economy still multiplies the bottom decile's real income several-fold, while redistribution is what compresses inequality in the first place.

This is the intuition that without competition, productivity gains become profits rather than lower prices — income flows to the owners of capital while labor, its wages driven down or automated away, is left unable to afford the abundance unless redistribution gives it a claim and competition keeps that claim valuable.

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
- **Small deadweight-loss exponent**: Market power enters chiefly as a *distributional* distortion — it compresses the labor share (`s_L/μ`) and routes rents to capital — while the efficiency loss is deliberately mild (`Y/μ^0.1`). Under duopoly this means output stays high; a larger exponent would model more aggressive monopoly output distortions.
- **No capital ownership broadening**: Sovereign wealth funds, stakeholder ownership, and broad-based equity participation are arguably a third policy dimension not yet modeled.
- **Exogenous market structure**: AI may itself drive concentration through economies of scale in training and data. Endogenizing N as a function of AI capability would capture this self-reinforcing dynamic.
- **Aggregate, not sectoral, bottleneck**: The physical bottleneck γ imposes economy-wide diminishing returns to capital, but the model still doesn't capture *sector-level* heterogeneity in automation difficulty (the full Baumol / Aghion-Jones-Jones mechanism, where slow-to-automate sectors come to dominate value added).
- **Stylized savings**: A richer household optimization problem (consumption-savings with borrowing constraints) would replace the fixed savings rates.
- **No international dimension**: Trade and cross-border capital flows matter for how AI's distributional effects play out globally.

Contributions addressing any of these are welcome.

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
