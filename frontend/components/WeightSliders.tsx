"use client";

import type { Weights } from "@/lib/scoring";
import { DEFAULT_WEIGHTS } from "@/lib/scoring";

function Slider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <span>{label}</span>
          <span className="text-[10px] font-normal text-ink-muted">· {hint}</span>
        </label>
        <span className="tabular-nums text-xs font-bold text-ink font-mono">
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider w-full cursor-pointer text-brand"
      />
    </div>
  );
}

export default function WeightSliders({
  weights,
  onChange,
}: {
  weights: Weights;
  onChange: (w: Weights) => void;
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            Interactive Rank Controls
          </h2>
          <p className="text-[9px] text-ink-muted mt-0.5">Adjust sliders to dynamically re-rank proposed infrastructure projects</p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_WEIGHTS })}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-ink-soft transition hover:bg-slate-50"
        >
          Reset Defaults
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Slider
          label="Demand Weight"
          hint="citizen volume"
          value={weights.demand}
          onChange={(v) => onChange({ ...weights, demand: v })}
        />
        <Slider
          label="Severity Weight"
          hint="corroborated impact"
          value={weights.severity}
          onChange={(v) => onChange({ ...weights, severity: v })}
        />
        <Slider
          label="Feasibility Weight"
          hint="cost & complexity"
          value={weights.feasibility}
          onChange={(v) => onChange({ ...weights, feasibility: v })}
        />
      </div>
    </div>
  );
}
