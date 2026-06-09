import { useState, useMemo, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart,
  ComposedChart
} from "recharts";
import {
  DEPRECIATION, T_PERIODS, N_DECILES, S_BASE,
  simulate, PRESETS, DEFAULT_PRESET,
} from "./src/model.js";


// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════

function Slider({ label, value, min, max, step, onChange, fmt, hint }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs tracking-wide" style={{ color: "#6b7280", fontFamily: "'Libre Baskerville', 'Georgia', serif" }}>{label}</span>
        <span className="text-sm font-mono font-semibold" style={{ color: "#1a1a2e" }}>
          {fmt ? fmt(value) : value}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ accentColor: "#2d3142" }}
        className="w-full h-1 rounded-full appearance-none cursor-pointer" />
      {hint && <div className="text-[9px] italic" style={{ color: "#9ca3af" }}>{hint}</div>}
    </div>
  );
}

function Metric({ label, v0, vT, fmt, good }) {
  const arrow = vT > v0 ? "↑" : vT < v0 ? "↓" : "→";
  const delta = v0 !== 0 ? ((vT / v0 - 1) * 100).toFixed(0) : "—";
  const status = good === undefined ? "neutral"
    : (typeof good === "function" ? good(vT) : (good ? "good" : "bad"));
  const colors = {
    good: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
    warn: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
    bad:  { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
    neutral: { bg: "#f8fafc", border: "#e2e8f0", text: "#1e293b" },
  };
  const c = colors[status] || colors.neutral;
  return (
    <div className="rounded p-2 text-center transition-colors duration-300"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
      <div className="text-[8px] uppercase tracking-widest mb-0.5" style={{ color: "#9ca3af" }}>{label}</div>
      <div className="text-base font-mono font-bold" style={{ color: c.text }}>{fmt(vT)}</div>
      <div className="text-[9px] mt-0.5 font-mono" style={{ color: "#9ca3af" }}>
        {fmt(v0)} {arrow} {delta !== "—" ? `${delta}%` : ""}
      </div>
    </div>
  );
}

const TT = ({ active, payload, label, labelFmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded shadow-lg p-2 text-xs" style={{ backgroundColor: "#1a1a2e", color: "#e5e7eb", zIndex: 50 }}>
      <div className="font-semibold mb-1" style={{ color: "#fbbf24" }}>{labelFmt ? labelFmt(label) : `Period ${label}`}</div>
      {payload.map((e, i) => (
        <div key={i} className="flex justify-between gap-3">
          <span style={{ color: e.color }}>{e.name}</span>
          <span className="font-mono">{typeof e.value === "number" ? e.value.toFixed(3) : e.value}</span>
        </div>
      ))}
    </div>
  );
};

const CHART_COLORS = {
  output: "#2d6a4f",
  price: "#9b2226",
  giniPost: "#7b2cbf",
  giniPre: "#c77dff",
  laborShare: "#3d5a80",
  d1: "#e07a5f",
  d5: "#81b29a",
  d10: "#264653",
  wages: "#3d5a80",
  capital: "#e07a5f",
  ubi: "#81b29a",
  capitalStock: "#b08968",
  alpha: "#6c757d",
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AGIEconomyDynamic() {
  const [params, setParams] = useState({ ...DEFAULT_PRESET });
  const [activePreset, setActivePreset] = useState("base");
  const [yScale, setYScale] = useState("linear"); // "linear" | "log" — toggles value-axis charts
  const set = useCallback((k, v) => { setActivePreset(null); setParams(p => ({ ...p, [k]: v })); }, []);

  const history = useMemo(() => simulate(params), [params]);
  const h0 = history[0];
  const hT = history[T_PERIODS];

  // Time series data for charts
  const tsData = useMemo(() => history.map(h => ({
    period: h.period,
    output: +h.Y.toFixed(4),
    price: +h.price.toFixed(4),
    priceComp: +h.priceComp.toFixed(4),
    priceActual: +h.priceActual.toFixed(4),
    giniPre: +h.giniPre.toFixed(4),
    giniPost: +h.giniPost.toFixed(4),
    laborShare: +(h.laborShare * 100).toFixed(2),
    d1Real: +h.d1Real.toFixed(5),
    d5Real: +h.d5Real.toFixed(5),
    d10Real: +h.d10Real.toFixed(5),
    capitalStock: +h.K.toFixed(4),
    alpha: +(h.alpha * 100).toFixed(1),
    topBottom: +h.topBottom.toFixed(2),
  })), [history]);

  // Final period decile composition
  const finalComp = useMemo(() => {
    const h = hT;
    const wagePer = (h.laborShare * h.Y) / N_DECILES;
    const capPool = (1 - h.laborShare) * h.Y;
    const meanY = h.Y / N_DECILES;
    return h.kFracs.map((f, i) => {
      const wageComp = (1 - params.t) * wagePer;
      const capComp = (1 - params.t) * capPool * f;
      const ubiComp = params.t * meanY;
      return {
        name: `D${i + 1}`,
        wages: +wageComp.toFixed(5),
        capital: +capComp.toFixed(5),
        ubi: +ubiComp.toFixed(5),
        total: +(wageComp + capComp + ubiComp).toFixed(5),
      };
    });
  }, [hT, params.t]);

  // Capital concentration over time (top decile share)
  const topCapShare0 = (h0.kFracs[9] * 100).toFixed(1);
  const topCapShareT = (hT.kFracs[9] * 100).toFixed(1);

  // Assessment
  const assessment = useMemo(() => {
    const lines = [];
    const yGrowth = ((hT.Y / h0.Y - 1) * 100).toFixed(0);
    const priceChange = ((hT.price - 1) * 100).toFixed(0);

    lines.push(`Over ${T_PERIODS} periods, output grows ${yGrowth}% while the price level ${hT.price < 0.5 ? "falls by " + Math.abs(+priceChange) + "%" : hT.price < 0.9 ? "declines modestly (" + priceChange + "%)" : hT.price > 1.1 ? "rises " + priceChange + "%" : "stays roughly flat"}.`);

    if (hT.price < 0.4 && params.N > 10) {
      lines.push("Competition drives dramatic deflation — goods become radically cheaper, validating the abundance thesis.");
    } else if (hT.price > 0.7 && params.N < 5) {
      lines.push("Market concentration prevents productivity gains from reaching consumers as lower prices. The cost savings are captured as rents.");
    }

    const d1Growth = ((hT.d1Real / h0.d1Real - 1) * 100).toFixed(0);
    const d10Growth = ((hT.d10Real / h0.d10Real - 1) * 100).toFixed(0);
    lines.push(`Real purchasing power: bottom decile ${+d1Growth > 0 ? "+" : ""}${d1Growth}%, top decile ${+d10Growth > 0 ? "+" : ""}${d10Growth}%.`);

    if (+d1Growth < 0) {
      lines.push("⚠ The bottom decile is absolutely worse off in real terms — this is the precariat scenario.");
    }

    const giniShift = hT.giniPost - h0.giniPost;
    if (giniShift > 0.1) {
      lines.push(`Inequality compounds over time (Gini: ${h0.giniPost.toFixed(2)} → ${hT.giniPost.toFixed(2)}) as capital ownership concentrates through differential savings.`);
    } else if (giniShift < -0.05) {
      lines.push(`Policy successfully counteracts compounding — inequality actually falls over time (Gini: ${h0.giniPost.toFixed(2)} → ${hT.giniPost.toFixed(2)}).`);
    }

    if (+topCapShareT > +topCapShare0 + 5) {
      lines.push(`Capital concentration intensifies: the top decile's capital share rises from ${topCapShare0}% to ${topCapShareT}%.`);
    }

    return lines.join(" ");
  }, [h0, hT, params.N, topCapShare0, topCapShareT]);

  const giniStatus = v => v > 0.5 ? "bad" : v > 0.35 ? "warn" : v < 0.25 ? "good" : "neutral";
  const priceStatus = v => v < 0.4 ? "good" : v > 1.0 ? "bad" : v < 0.7 ? "good" : "neutral";

  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", background: "#fafaf8", minHeight: "100vh" }}>
      <div className="max-w-6xl mx-auto p-4">

        {/* ── HEADER ── */}
        <div className="mb-4 pb-3" style={{ borderBottom: "2px solid #1a1a2e" }}>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1a1a2e" }}>
            The AGI Economy — Dynamic Model
          </h1>
          <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
            General equilibrium with endogenous capital accumulation, {T_PERIODS}-period simulation · Automation ramps logistically from 30% toward target
          </p>
        </div>

        {/* ── PRESETS ── */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PRESETS.map(p => (
            <button key={p.id}
              onClick={() => { setParams({ ...p }); setActivePreset(p.id); }}
              className="px-3 py-1 text-xs rounded-sm transition-all cursor-pointer border"
              style={{
                backgroundColor: activePreset === p.id ? "#1a1a2e" : "white",
                color: activePreset === p.id ? "#fbbf24" : "#4b5563",
                borderColor: activePreset === p.id ? "#1a1a2e" : "#d1d5db",
              }}>
              <span className="mr-1">{p.icon}</span>{p.label}
            </button>
          ))}
        </div>

        {/* ── SLIDERS ── */}
        <div className="rounded p-3 mb-4" style={{ backgroundColor: "white", border: "1px solid #e5e7eb" }}>
          <div className="grid grid-cols-4 gap-x-6 gap-y-3">
            <div>
              <div className="text-[8px] uppercase tracking-widest mb-2 font-bold" style={{ color: "#9ca3af" }}>Technology</div>
              <div className="flex flex-col gap-2.5">
                <Slider label="Target Automation α" value={params.alphaTarget} min={0.30} max={0.95} step={0.05}
                  onChange={v => set("alphaTarget", v)} fmt={v => `${(v * 100).toFixed(0)}%`}
                  hint="Logistic ramp from 30% to this level" />
                <Slider label="Substitutability σ" value={params.sigma} min={0.3} max={3} step={0.1}
                  onChange={v => set("sigma", v)} fmt={v => v.toFixed(1)}
                  hint="σ>1: easy to replace labor. σ<1: labor is bottleneck" />
                <Slider label="AI Productivity Growth" value={params.gA} min={0} max={0.15} step={0.005}
                  onChange={v => set("gA", v)} fmt={v => `${(v * 100).toFixed(1)}%/yr`}
                  hint="Annual compound growth of AI capability" />
                <Slider label="Physical Bottleneck γ" value={params.gamma} min={0.5} max={1.0} step={0.05}
                  onChange={v => set("gamma", v)} fmt={v => v.toFixed(2)}
                  hint="Returns to capital (energy/compute/land). γ=1: no limit (AK singularity); lower=tighter" />
              </div>
            </div>
            <div>
              <div className="text-[8px] uppercase tracking-widest mb-2 font-bold" style={{ color: "#9ca3af" }}>Competition Policy</div>
              <div className="flex flex-col gap-2.5">
                <Slider label="Competing Firms N" value={params.N} min={1} max={50} step={1}
                  onChange={v => set("N", v)} fmt={v => v}
                  hint="N=1 monopoly → N=50 competitive" />
              </div>
              <div className="text-[8px] uppercase tracking-widest mb-2 mt-4 font-bold" style={{ color: "#9ca3af" }}>Redistribution Policy</div>
              <div className="flex flex-col gap-2.5">
                <Slider label="NIT / UBI Rate t" value={params.t} min={0} max={0.6} step={0.01}
                  onChange={v => set("t", v)} fmt={v => `${(v * 100).toFixed(0)}%`}
                  hint="y_net = (1−t)·y + t·ȳ, budget-balanced" />
              </div>
            </div>
            <div>
              <div className="text-[8px] uppercase tracking-widest mb-2 font-bold" style={{ color: "#9ca3af" }}>Capital Structure</div>
              <div className="flex flex-col gap-2.5">
                <Slider label="Initial Wealth Conc. θ" value={params.theta} min={0} max={5} step={0.1}
                  onChange={v => set("theta", v)} fmt={v => v.toFixed(1)}
                  hint="k_i ∝ i^θ. θ=0 equal, θ=5 extreme" />
                <Slider label="Savings Spread" value={params.savingsSpread} min={0} max={3} step={0.1}
                  onChange={v => set("savingsSpread", v)} fmt={v => v.toFixed(1)}
                  hint="How much more the rich save. 0=equal, 3=extreme" />
              </div>
            </div>
            <div>
              <div className="text-[8px] uppercase tracking-widest mb-2 font-bold" style={{ color: "#9ca3af" }}>Derived (period 0 → {T_PERIODS})</div>
              <div className="text-[11px] space-y-1" style={{ color: "#4b5563" }}>
                <div className="flex justify-between"><span>Automation:</span><span className="font-mono">{(h0.alpha * 100).toFixed(0)}% → {(hT.alpha * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between"><span>AI Productivity:</span><span className="font-mono">{h0.A.toFixed(1)}× → {hT.A.toFixed(1)}×</span></div>
                <div className="flex justify-between"><span>Capital Stock:</span><span className="font-mono">{h0.K.toFixed(2)} → {hT.K.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Markup μ:</span><span className="font-mono">{hT.mu.toFixed(2)}×</span></div>
                <div className="flex justify-between"><span>Top Decile K share:</span><span className="font-mono">{topCapShare0}% → {topCapShareT}%</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── METRICS ── */}
        <div className="grid grid-cols-6 gap-1.5 mb-4">
          <Metric label="Output" v0={h0.Y} vT={hT.Y}
            fmt={v => v.toFixed(2)} good={() => hT.Y >= h0.Y ? "good" : "warn"} />
          <Metric label="Price Index" v0={h0.price} vT={hT.price}
            fmt={v => v.toFixed(2)} good={priceStatus} />
          <Metric label="Labor Share" v0={h0.laborShare} vT={hT.laborShare}
            fmt={v => `${(v * 100).toFixed(1)}%`}
            good={() => hT.laborShare < 0.15 ? "bad" : hT.laborShare < 0.30 ? "warn" : "good"} />
          <Metric label="Post-tax Gini" v0={h0.giniPost} vT={hT.giniPost}
            fmt={v => v.toFixed(3)} good={giniStatus} />
          <Metric label="Top ÷ Bottom" v0={h0.topBottom} vT={hT.topBottom}
            fmt={v => `${v.toFixed(1)}×`}
            good={() => hT.topBottom > 20 ? "bad" : hT.topBottom > 8 ? "warn" : "good"} />
          <Metric label="D1 Real Income" v0={h0.d1Real} vT={hT.d1Real}
            fmt={v => v.toFixed(3)}
            good={() => hT.d1Real >= h0.d1Real ? "good" : "bad"} />
        </div>

        {/* ── CHART SCALE TOGGLE ── */}
        <div className="flex items-center justify-end gap-1.5 mb-2">
          <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "#9ca3af" }}>Value axis</span>
          {["linear", "log"].map(s => (
            <button key={s} onClick={() => setYScale(s)}
              className="px-2.5 py-0.5 text-[10px] rounded-sm transition-all cursor-pointer border capitalize"
              style={{
                backgroundColor: yScale === s ? "#1a1a2e" : "white",
                color: yScale === s ? "#fbbf24" : "#4b5563",
                borderColor: yScale === s ? "#1a1a2e" : "#d1d5db",
              }}>
              {s}
            </button>
          ))}
        </div>

        {/* ── TIME SERIES ROW 1: Output+Price, Gini+LaborShare ── */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded p-3" style={{ backgroundColor: "white", border: "1px solid #e5e7eb" }}>
            <h2 className="text-[9px] uppercase tracking-widest mb-2 font-bold" style={{ color: "#6b7280" }}>
              Output & Price Level Over Time
            </h2>
            <ResponsiveContainer width="100%" height={210}>
              <ComposedChart data={tsData}>
                <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
                <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#9ca3af" }}
                  label={{ value: "Period", position: "insideBottom", offset: -2, fontSize: 9, fill: "#9ca3af" }} />
                <YAxis yAxisId="L" scale={yScale} domain={['auto', 'auto']} allowDataOverflow tick={{ fontSize: 9, fill: "#9ca3af" }}
                  label={{ value: "Output (Y)", angle: -90, position: "insideLeft", fontSize: 8, fill: CHART_COLORS.output }} />
                <YAxis yAxisId="R" orientation="right" scale={yScale} domain={['auto', 'auto']} allowDataOverflow tick={{ fontSize: 9, fill: "#9ca3af" }}
                  label={{ value: "Price Index", angle: 90, position: "insideRight", fontSize: 8, fill: CHART_COLORS.price }} />
                <Tooltip content={<TT />} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Line yAxisId="L" type="monotone" dataKey="output" stroke={CHART_COLORS.output}
                  strokeWidth={2.5} dot={false} name="Output" />
                <Line yAxisId="R" type="monotone" dataKey="priceActual" stroke={CHART_COLORS.price}
                  strokeWidth={2.5} dot={false} name="Price (actual)" strokeDasharray="6 3" />
                <Line yAxisId="R" type="monotone" dataKey="priceComp" stroke="#c98a8a"
                  strokeWidth={1.5} dot={false} name="Price (if competitive)" strokeDasharray="2 2" />
                <ReferenceLine yAxisId="R" y={1} stroke="#9ca3af" strokeDasharray="3 3" strokeWidth={1} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded p-3" style={{ backgroundColor: "white", border: "1px solid #e5e7eb" }}>
            <h2 className="text-[9px] uppercase tracking-widest mb-2 font-bold" style={{ color: "#6b7280" }}>
              Inequality & Labor Share Over Time
            </h2>
            <ResponsiveContainer width="100%" height={210}>
              <ComposedChart data={tsData}>
                <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
                <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#9ca3af" }}
                  label={{ value: "Period", position: "insideBottom", offset: -2, fontSize: 9, fill: "#9ca3af" }} />
                <YAxis yAxisId="L" tick={{ fontSize: 9, fill: "#9ca3af" }} domain={[0, 1]}
                  label={{ value: "Gini", angle: -90, position: "insideLeft", fontSize: 8, fill: CHART_COLORS.giniPost }} />
                <YAxis yAxisId="R" orientation="right" tick={{ fontSize: 9, fill: "#9ca3af" }}
                  label={{ value: "Labor Share %", angle: 90, position: "insideRight", fontSize: 8, fill: CHART_COLORS.laborShare }} />
                <Tooltip content={<TT />} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Line yAxisId="L" type="monotone" dataKey="giniPre" stroke={CHART_COLORS.giniPre}
                  strokeWidth={1.5} dot={false} name="Pre-tax Gini" strokeDasharray="4 2" />
                <Line yAxisId="L" type="monotone" dataKey="giniPost" stroke={CHART_COLORS.giniPost}
                  strokeWidth={2.5} dot={false} name="Post-tax Gini" />
                <Line yAxisId="R" type="monotone" dataKey="laborShare" stroke={CHART_COLORS.laborShare}
                  strokeWidth={2} dot={false} name="Labor Share %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── TIME SERIES ROW 2: Real Income by Decile, Capital Stock ── */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded p-3" style={{ backgroundColor: "white", border: "1px solid #e5e7eb" }}>
            <h2 className="text-[9px] uppercase tracking-widest mb-2 font-bold" style={{ color: "#6b7280" }}>
              Real Purchasing Power Over Time (Post-tax Share of Real Output)
            </h2>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={tsData}>
                <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
                <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#9ca3af" }}
                  label={{ value: "Period", position: "insideBottom", offset: -2, fontSize: 9, fill: "#9ca3af" }} />
                <YAxis scale={yScale} domain={['auto', 'auto']} allowDataOverflow tick={{ fontSize: 9, fill: "#9ca3af" }}
                  label={{ value: "Real Income", angle: -90, position: "insideLeft", fontSize: 8, fill: "#9ca3af" }} />
                <Tooltip content={<TT />} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Line type="monotone" dataKey="d10Real" stroke={CHART_COLORS.d10}
                  strokeWidth={2.5} dot={false} name="D10 (Top)" />
                <Line type="monotone" dataKey="d5Real" stroke={CHART_COLORS.d5}
                  strokeWidth={2} dot={false} name="D5 (Median)" />
                <Line type="monotone" dataKey="d1Real" stroke={CHART_COLORS.d1}
                  strokeWidth={2.5} dot={false} name="D1 (Bottom)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded p-3" style={{ backgroundColor: "white", border: "1px solid #e5e7eb" }}>
            <h2 className="text-[9px] uppercase tracking-widest mb-2 font-bold" style={{ color: "#6b7280" }}>
              Capital Accumulation & Automation Path
            </h2>
            <ResponsiveContainer width="100%" height={210}>
              <ComposedChart data={tsData}>
                <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
                <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#9ca3af" }}
                  label={{ value: "Period", position: "insideBottom", offset: -2, fontSize: 9, fill: "#9ca3af" }} />
                <YAxis yAxisId="L" scale={yScale} domain={['auto', 'auto']} allowDataOverflow tick={{ fontSize: 9, fill: "#9ca3af" }}
                  label={{ value: "Capital Stock", angle: -90, position: "insideLeft", fontSize: 8, fill: CHART_COLORS.capitalStock }} />
                <YAxis yAxisId="R" orientation="right" tick={{ fontSize: 9, fill: "#9ca3af" }} domain={[0, 100]}
                  label={{ value: "Automation %", angle: 90, position: "insideRight", fontSize: 8, fill: CHART_COLORS.alpha }} />
                <Tooltip content={<TT />} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Line yAxisId="L" type="monotone" dataKey="capitalStock" stroke={CHART_COLORS.capitalStock}
                  strokeWidth={2.5} dot={false} name="Capital Stock" />
                <Line yAxisId="R" type="monotone" dataKey="alpha" stroke={CHART_COLORS.alpha}
                  strokeWidth={2} dot={false} name="Automation %" strokeDasharray="6 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── FINAL PERIOD DISTRIBUTION ── */}
        <div className="rounded p-3 mb-3" style={{ backgroundColor: "white", border: "1px solid #e5e7eb" }}>
          <h2 className="text-[9px] uppercase tracking-widest mb-2 font-bold" style={{ color: "#6b7280" }}>
            Final Period (t={T_PERIODS}) — Post-tax Income Composition by Decile
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={finalComp} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <Tooltip content={<TT labelFmt={l => `Decile ${String(l).replace(/^D/, "")}`} />} />
              <Legend wrapperStyle={{ fontSize: 9 }}
                formatter={v => v === "wages" ? "After-tax Wages" : v === "capital" ? "After-tax Capital Income" : "UBI / NIT Transfer"} />
              <Bar dataKey="wages" stackId="a" fill={CHART_COLORS.wages} name="wages" />
              <Bar dataKey="capital" stackId="a" fill={CHART_COLORS.capital} name="capital" />
              <Bar dataKey="ubi" stackId="a" fill={CHART_COLORS.ubi} radius={[2, 2, 0, 0]} name="ubi" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── ASSESSMENT ── */}
        <div className="rounded p-3 mb-3" style={{ backgroundColor: "white", border: "1px solid #e5e7eb" }}>
          <h2 className="text-[9px] uppercase tracking-widest mb-1.5 font-bold" style={{ color: "#6b7280" }}>Dynamic Assessment</h2>
          <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>{assessment}</p>
        </div>

        {/* ── MODEL DOCUMENTATION ── */}
        <div className="rounded p-3" style={{ backgroundColor: "#f1f0eb", border: "1px solid #e5e7eb" }}>
          <h2 className="text-[9px] uppercase tracking-widest mb-2 font-bold" style={{ color: "#6b7280" }}>Model Structure</h2>
          <div className="grid grid-cols-2 gap-4 text-[10px] leading-relaxed" style={{ color: "#4b5563" }}>
            <div>
              <p className="font-bold mb-0.5" style={{ color: "#1a1a2e" }}>Production (CES task framework)</p>
              <p>Y = [α<sup>1/σ</sup>(A·K<sup>γ</sup>)<sup>ρ</sup> + (1−α)<sup>1/σ</sup>L<sup>ρ</sup>]<sup>1/ρ</sup> / μ<sup>0.7</sup>. Automation α ramps logistically from 30% toward target. AI productivity A grows at rate g<sub>A</sub>. Physical bottleneck γ&lt;1 imposes diminishing returns to capital (a fixed energy/compute/land factor); γ=1 is an AK economy that has no balanced path when σ&gt;1.</p>

              <p className="font-bold mt-1.5 mb-0.5" style={{ color: "#1a1a2e" }}>Market Power (Cournot)</p>
              <p>Markup μ = Nε/(Nε−1), ε=2. Effective labor share = s<sub>L</sub>/μ. DWL factor μ<sup>0.7</sup> reduces output below potential — competition grows the real pie. Profit share (1−1/μ)·Y flows to capital owners by holdings.</p>

              <p className="font-bold mt-1.5 mb-0.5" style={{ color: "#1a1a2e" }}>Prices &amp; Real Income</p>
              <p>Two price lines, both normalized so the competitive price (marginal cost ∝ 1/productivity) = 1 at t=0: <em>competitive</em> = 1/Z and <em>actual</em> = μ/Z. Their gap is the productivity gain captured as profit rather than passed to consumers. Real purchasing power is each decile's post-tax share of real output (one good ⇒ no separate deflation).</p>
            </div>
            <div>
              <p className="font-bold mb-0.5" style={{ color: "#1a1a2e" }}>Capital Dynamics</p>
              <p>k<sub>i,t+1</sub> = (1−δ)k<sub>i,t</sub> + s<sub>i</sub>·y<sup>net</sup><sub>i,t</sub>. Depreciation δ={DEPRECIATION}. Savings rate s<sub>i</sub> = {(S_BASE*100).toFixed(0)}% × (1 + spread × rank/10). Richer deciles save more → capital concentrates endogenously.</p>

              <p className="font-bold mt-1.5 mb-0.5" style={{ color: "#1a1a2e" }}>Negative Income Tax</p>
              <p>y<sup>net</sup> = (1−t)·y + t·ȳ. Budget-balanced. Labor response: L = (1−λt)·(1−α)<sup>0.3</sup>, λ=0.25 — both the tax and automation (falling effective wages) reduce labor supply.</p>

              <p className="font-bold mt-1.5 mb-0.5" style={{ color: "#1a1a2e" }}>Key Mechanisms</p>
              <p>Competition (↑N) → lower μ → productivity gains reach consumers as lower prices (not profits), less rent extraction, and a larger real pie (less DWL). NIT (↑t) → gives displaced labor a claim on output and slows differential capital accumulation. Competition sets the size of the pie; redistribution sets who shares it — both are needed.</p>
            </div>
          </div>
        </div>

        <div className="mt-2 text-[8px] text-center" style={{ color: "#9ca3af" }}>
          Wenger–Claude collaboration · Task-based GE with endogenous capital accumulation · Building on Acemoglu & Restrepo, Moll, Rachel & Restrepo, Korinek & Stiglitz, Saint-Paul
        </div>
      </div>
    </div>
  );
}
