// Client-side weighting + re-sort (ADR-7, RULES.md #7).
// Backend returns RAW component scores; the frontend NEVER receives a
// pre-weighted final score. Sliders re-order with zero network calls.
//
//   final_score = w1·demand + w2·severity + w3·feasibility
//
// Weights arrive as percentages (default 40/40/20). We normalize so the
// final score stays on a 0–100 scale regardless of slider sums.

import type { Project } from "./types";

export interface Weights {
  demand: number;
  severity: number;
  feasibility: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  demand: 40,
  severity: 40,
  feasibility: 20,
};

export interface RankedProject extends Project {
  final_score: number;
}

export function finalScore(p: Project, w: Weights): number {
  const total = w.demand + w.severity + w.feasibility || 1;
  const raw =
    w.demand * p.demand_score +
    w.severity * p.severity_score +
    w.feasibility * p.feasibility_score;
  return raw / total;
}

/** Returns projects sorted high→low by weighted final score. */
export function applyWeights(projects: Project[], w: Weights): RankedProject[] {
  return projects
    .map((p) => ({ ...p, final_score: finalScore(p, w) }))
    .sort((a, b) => b.final_score - a.final_score);
}
