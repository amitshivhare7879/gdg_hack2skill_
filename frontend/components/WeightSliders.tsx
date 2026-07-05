"use client";

import type { Weights } from "@/lib/scoring";
import { DEFAULT_WEIGHTS } from "@/lib/scoring";

function Slider({
  label,
  hint,
  value,
  accent,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  accent: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
          {label}
          <span className="text-xs font-normal text-ink-muted">· {hint}</span>
        </label>
        <span
          className="tabular-nums rounded-md px-2 py-0.5 text-sm font-bold"
          style={{ background: `${accent}1a`, color: accent }}
        >
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
        className="slider w-full cursor-pointer"
        style={{ color: accent }}
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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-ink-muted">
          Priority weights
        </h2>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_WEIGHTS })}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-dark transition hover:bg-brand-light"
        >
          Reset
        </button>
      </div>
      <div className="space-y-5">
        <Slider
          label="Demand"
          hint="equity-adjusted"
          value={weights.demand}
          accent="#4F46E5"
          onChange={(v) => onChange({ ...weights, demand: v })}
        />
        <Slider
          label="Severity"
          hint="data-corroborated"
          value={weights.severity}
          accent="#E11D48"
          onChange={(v) => onChange({ ...weights, severity: v })}
        />
        <Slider
          label="Feasibility"
          hint="cost & timeline"
          value={weights.feasibility}
          accent="#0EA5E9"
          onChange={(v) => onChange({ ...weights, feasibility: v })}
        />
      </div>
      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-ink-muted">
        Drag to re-rank instantly. Weights apply client-side — the backend never
        returns a pre-weighted score.
      </p>
    </div>
  );
}
