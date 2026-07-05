import type { RankedProject } from "@/lib/scoring";
import { categoryMeta } from "@/lib/ui";

function ScoreBar({
  label,
  score,
  evidence,
  color,
}: {
  label: string;
  score: number;
  evidence: string;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        <span className="tabular-nums text-xs font-bold text-ink">{score}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full origin-left rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(0, Math.min(100, score))}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
          }}
        />
      </div>
      <p className="mt-1.5 text-xs leading-snug text-ink-muted">{evidence}</p>
    </div>
  );
}

export default function PriorityCard({
  project,
  rank,
}: {
  project: RankedProject;
  rank: number;
}) {
  const cat = categoryMeta(project.category);
  const top = rank === 1;
  return (
    <article
      className={`rank-flip flex gap-4 rounded-2xl border bg-white p-5 shadow-card hover:shadow-lift ${
        top ? "border-brand/40 ring-1 ring-brand/20" : "border-slate-200/80"
      }`}
    >
      {/* Rank + score rail */}
      <div className="flex w-16 flex-col items-center">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow ${
            top ? "bg-brand-gradient shadow-glow" : "bg-ink-gradient"
          }`}
        >
          {rank}
        </div>
        <div className="mt-3 text-center">
          <div className="tabular-nums text-2xl font-extrabold leading-none text-gradient">
            {Math.round(project.final_score)}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            score
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold leading-snug text-ink">{project.title}</h3>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${cat.chip}`}>
            {cat.emoji} {cat.label}
          </span>
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <ScoreBar label="Demand" score={project.demand_score} evidence={project.demand_evidence} color="#4F46E5" />
          <ScoreBar label="Severity" score={project.severity_score} evidence={project.severity_evidence} color="#E11D48" />
          <ScoreBar label="Feasibility" score={project.feasibility_score} evidence={project.feasibility_evidence} color="#0EA5E9" />
        </div>

        {project.data_sources.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Sources
            </span>
            {project.data_sources.map((s) => (
              <span
                key={s}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-ink-soft"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
