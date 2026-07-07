import type { RankedProject } from "@/lib/scoring";
import { categoryMeta } from "@/lib/ui";

function ScoreBar({
  label,
  score,
  evidence,
}: {
  label: string;
  score: number;
  evidence: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
          {label}
        </span>
        <span className="tabular-nums text-xs font-bold text-ink font-mono">{score}/100</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded bg-slate-100">
        <div
          className="h-full origin-left transition-all duration-500 bg-ink-soft"
          style={{
            width: `${Math.max(0, Math.min(100, score))}%`,
          }}
        />
      </div>
      <p className="text-[10px] leading-normal text-ink-muted">{evidence}</p>
    </div>
  );
}

import type { Cluster } from "@/lib/types";

export default function PriorityCard({
  project,
  rank,
  clusters = [],
}: {
  project: RankedProject;
  rank: number;
  clusters?: Cluster[];
}) {
  const cat = categoryMeta(project.category);
  const top = rank === 1;

  const linkedClusters = clusters.filter((c) => project.linked_cluster_ids.includes(c.id));

  return (
    <article
      className={`rank-flip rounded border p-4 transition ${
        top
          ? "border-l-4 border-l-brand border-y-slate-200 border-r-slate-200 bg-brand-light/20"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[90px_1fr_420px] gap-4 items-center">
        {/* Col 1: Ranks & Index */}
        <div className="flex items-center gap-3 border-b lg:border-b-0 lg:border-r border-slate-100 pb-2 lg:pb-0">
          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-extrabold uppercase tracking-wider ${
              top ? "bg-brand text-white" : "bg-slate-100 text-ink-soft border border-slate-200"
            }`}
          >
            #{rank}
          </div>
          <div className="text-center lg:text-left">
            <div className={`tabular-nums text-xl font-extrabold leading-none font-heading ${top ? "text-brand" : "text-ink"}`}>
              {Math.round(project.final_score)}
            </div>
            <div className="text-[7px] font-bold uppercase tracking-wider text-ink-muted mt-0.5">
              INDEX
            </div>
          </div>
        </div>

        {/* Col 2: Title & Details */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-bold leading-snug text-ink font-heading truncate">
              {project.title}
            </h3>
            <span className="inline-block border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-ink-soft rounded shrink-0">
              {cat.label}
            </span>
          </div>
          <p className="text-[9px] text-ink-muted mt-1">
            Ward Area: <span className="font-semibold text-ink-soft">{project.locality}</span>
          </p>
        </div>

        {/* Col 3: Three Scores Side-by-Side */}
        <div className="grid grid-cols-3 gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-4">
          <ScoreBar label="Demand" score={project.demand_score} evidence={project.demand_evidence} />
          <ScoreBar label="Severity" score={project.severity_score} evidence={project.severity_evidence} />
          <ScoreBar label="Feasibility" score={project.feasibility_score} evidence={project.feasibility_evidence} />
        </div>
      </div>

      {linkedClusters.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 text-[8px]">
          <span className="font-bold uppercase tracking-widest text-ink-muted mr-1">
            Linked Citizen Issues:
          </span>
          {linkedClusters.map((c) => (
            <span
              key={c.id}
              className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-bold text-ink-soft"
            >
              {c.label}
            </span>
          ))}
        </div>
      )}

      {project.data_sources.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 text-[8px]">
          <span className="font-bold uppercase tracking-widest text-ink-muted mr-1">
            Evidence Sources:
          </span>
          {project.data_sources.map((s) => (
            <span
              key={s}
              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-bold text-ink-muted font-mono"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
