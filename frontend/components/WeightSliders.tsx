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
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-sm font-medium text-ink">
          {label} <span className="text-xs font-normal text-gray-400">· {hint}</span>
        </label>
        <span className="tabular-nums text-sm font-semibold text-ink">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-brand"
        style={{ accentColor: accent }}
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
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Priority weights
        </h2>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_WEIGHTS })}
          className="text-xs font-medium text-brand-dark hover:underline"
        >
          Reset
        </button>
      </div>
      <div className="space-y-4">
        <Slider
          label="Demand"
          hint="equity-adjusted"
          value={weights.demand}
          accent="#4f46e5"
          onChange={(v) => onChange({ ...weights, demand: v })}
        />
        <Slider
          label="Severity"
          hint="data-corroborated"
          value={weights.severity}
          accent="#e11d48"
          onChange={(v) => onChange({ ...weights, severity: v })}
        />
        <Slider
          label="Feasibility"
          hint="cost & timeline"
          value={weights.feasibility}
          accent="#0284c7"
          onChange={(v) => onChange({ ...weights, feasibility: v })}
        />
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Drag to re-rank instantly. Weights are applied client-side — the backend
        never returns a pre-weighted score.
      </p>
    </div>
  );
}
