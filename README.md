# The AGI Economy: A General Equilibrium Model

An interactive general equilibrium model exploring how automation, market structure, and redistribution policy shape economic outcomes in an AI-driven economy.

**[Try the live model →](https://claude.ai/public/artifacts/87463911-87e4-455b-8a43-9ffc65f68259)**

**[Read the blog post →](https://continuations.com)** *(update with actual URL)*

## The Question

Will advanced AI create broadly shared prosperity or extreme wealth concentration? The answer depends on policy. This model lets you explore how two levers — market competition and redistribution — interact with automation to produce radically different outcomes.

## Model Architecture

The model combines four building blocks, each grounded in the academic literature:

### 1. Production (CES Task Framework)

Following [Acemoglu & Restrepo (2022)](https://ideas.repec.org/a/wly/emetrp/v90y2022i5p1973-2016.html), output is produced by combining automated and labor tasks via a CES aggregator:

```
Y = [α^(1/σ) · (A·K)^ρ + (1−α)^(1/σ) · L^ρ]^(1/ρ) / μ^0.1
```

- **α** — share of tasks automated by AI-capital
- **A** — AI productivity (compounds over time at rate g_A)
- **σ** — elasticity of substitution between capital and labor
- **ρ = (σ−1)/σ**

The automation share α ramps logistically from 30% toward a user-specified target over the simulation horizon, capturing gradual AI diffusion.

### 2. Market Power (Cournot Competition)

N symmetric firms compete with demand elasticity ε=2, yielding markup:

```
μ = Nε / (Nε − 1)
```

The markup compresses the effective labor share (workers receive s_L/μ of output) and creates deadweight loss (Y_actual = Y_potential / μ^0.1). Monopoly rents (1 − 1/μ)·Y flow to capital owners proportional to their capital holdings.

This captures the core policy insight: competition determines whether AI cost savings reach consumers as lower prices or get captured as profits. N is treated as exogenous because it is subject to policy (antitrust, regulation, open standards).

### 3. Capital Dynamics (Heterogeneous Agents)

Inspired by [Moll, Rachel & Restrepo (2022)](https://benjaminmoll.com/wp-content/uploads/2019/07/UG.pdf), ten household deciles hold unequal capital stocks:

```
k_i ∝ i^θ          (initial distribution, θ controls concentration)
k_{i,t+1} = (1−δ)·k_{i,t} + s_i · y_net_{i,t}    (accumulation)
s_i = s_base · (1 + spread · i/10)                  (differential savings)
```

Richer households save a larger fraction of income, so capital ownership concentrates endogenously over time — the Piketty r > g mechanism emerges from the model rather than being assumed.

### 4. Negative Income Tax / UBI

Budget-balanced redistribution:

```
y_net = (1−t)·y + t·ȳ
```

Below-mean earners receive transfers; above-mean earners pay. Labor supply responds to the tax rate with elasticity λ=0.25, capturing disincentive effects.

### Price Index

```
P_t = μ / productivity_t,  normalized to P_0 = 1
```

Falls with productivity growth; inflated by markup. Real purchasing power = nominal income / P_t. This is the key metric for the "everything gets cheap" thesis.

## Parameters

| Parameter | Symbol | Range | Description |
|-----------|--------|-------|-------------|
| Target Automation | α | 0.30–0.95 | Long-run share of tasks performed by AI-capital |
| Substitutability | σ | 0.3–3.0 | σ>1: easy to replace labor; σ<1: labor is bottleneck |
| AI Productivity Growth | g_A | 0–15%/yr | Compound growth rate of AI capability |
| Competing Firms | N | 1–50 | Market structure: 1=monopoly, 50≈perfect competition |
| NIT/UBI Rate | t | 0–60% | Negative income tax rate |
| Wealth Concentration | θ | 0–5 | Initial capital distribution skewness |
| Savings Spread | — | 0–3 | How much more the rich save vs. the poor |

## Scenarios

Five presets illustrate the range of outcomes:

| Preset | α | σ | N | t | Key Outcome |
|--------|---|---|---|---|-------------|
| **Today's Trajectory** | 50% | 1.0 | 12 | 10% | Moderate growth, slowly rising inequality |
| **AI Dystopia** | 90% | 1.8 | 2 | 0% | Output soars but bottom decile loses purchasing power |
| **AI Utopia** | 90% | 1.8 | 30 | 30% | Broadly shared prosperity, falling prices |
| **Redistribution Only** | 90% | 1.8 | 2 | 40% | Gini compressed but transfers subsidize monopoly rents |
| **Competition Only** | 90% | 1.8 | 30 | 0% | Prices fall but capital concentration still compounds |

## Key Finding

Neither competition nor redistribution alone is sufficient. Competition without redistribution drives prices down but leaves capital ownership concentrated. Redistribution without competition subsidizes monopoly rents. The combination produces broadly shared prosperity across a wide range of parameter settings.

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

- **Flat tax**: The NIT taxes all income uniformly. Progressive rates or differential treatment of capital vs. labor income would better capture real policy options.
- **No capital ownership broadening**: Sovereign wealth funds, stakeholder ownership, and broad-based equity participation are arguably a third policy dimension not yet modeled.
- **Exogenous market structure**: AI may itself drive concentration through economies of scale in training and data. Endogenizing N as a function of AI capability would capture this self-reinforcing dynamic.
- **No Baumol bottlenecks**: The model doesn't capture sector-level heterogeneity in automation difficulty, which Aghion-Jones-Jones emphasize as a constraint on aggregate growth.
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
