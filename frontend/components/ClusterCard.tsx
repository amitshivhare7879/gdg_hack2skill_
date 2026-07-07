import type { Cluster } from "@/lib/types";
import { categoryMeta, severityMeta } from "@/lib/ui";

export default function ClusterCard({
  cluster,
  onOpen,
}: {
  cluster: Cluster;
  onOpen: (c: Cluster) => void;
}) {
  const cat = categoryMeta(cluster.category);
  const sev = severityMeta(cluster.severity);
  const mixed =
    cluster.complaints.some((c) => c.original_language === "hi") &&
    cluster.complaints.some((c) => c.original_language === "en");

  const isHigh = cluster.severity === "high";

  return (
    <button
      onClick={() => onOpen(cluster)}
      className={`group relative flex h-full w-full flex-col items-start rounded border p-4 text-left transition hover:bg-slate-50/50 ${
        isHigh
          ? "border-l-4 border-l-brand border-y-slate-200 border-r-slate-200"
          : "border-slate-200"
      }`}
    >
      <div className="mb-3.5 flex w-full items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">
          {cat.label}
        </span>
        <span className={`text-[9px] font-extrabold uppercase tracking-wider ${isHigh ? "text-brand" : "text-ink-soft"}`}>
          {sev.label} Severity
        </span>
      </div>

      <h3 className="mb-3 text-xs font-bold leading-snug text-ink font-heading group-hover:text-brand transition-colors line-clamp-2">
        {cluster.label}
      </h3>

      <div className="mt-auto flex w-full items-center justify-between border-t border-slate-100 pt-3 text-[10px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="font-bold text-ink font-mono">{cluster.complaint_count}</span>
            <span className="text-ink-muted">complaints</span>
          </span>
          <span className="text-slate-350">·</span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-ink font-mono">{cluster.citizen_count}</span>
            <span className="text-ink-muted">citizens</span>
          </span>
        </div>
        <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider transition-colors group-hover:text-brand">
          Details
        </span>
      </div>

      {mixed && (
        <div className="mt-3 inline-flex items-center gap-1.5 border border-slate-200 bg-white px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-ink-muted">
          <span className="border border-slate-200 px-1 text-[7px]">HI</span>
          <span className="border border-slate-200 px-1 text-[7px]">EN</span>
          <span>Merged Languages</span>
        </div>
      )}
    </button>
  );
}
