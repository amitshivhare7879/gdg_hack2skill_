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
      <div className="mb-0.5 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </span>
        <span className="tabular-nums text-xs font-semibold text-ink">{score}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(0, Math.min(100, score))}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1 text-xs leading-snug text-gray-500">{evidence}</p>
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
  return (
    <article className="rank-flip flex gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
          {rank}
        </div>
        <div className="mt-2 text-center">
          <div className="tabular-nums text-lg font-bold text-brand-dark">
            {Math.round(project.final_score)}
          </div>
          <div className="text-[10px] uppercase text-gray-400">score</div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-ink">{project.title}</h3>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cat.chip}`}>
            {cat.emoji} {cat.label}
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <ScoreBar label="Demand" score={project.demand_score} evidence={project.demand_evidence} color="#4f46e5" />
          <ScoreBar label="Severity" score={project.severity_score} evidence={project.severity_evidence} color="#e11d48" />
          <ScoreBar label="Feasibility" score={project.feasibility_score} evidence={project.feasibility_evidence} color="#0284c7" />
        </div>

        {project.data_sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.data_sources.map((s) => (
              <span
                key={s}
                className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500"
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
