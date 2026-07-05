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

  return (
    <button
      onClick={() => onOpen(cluster)}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-card transition duration-200 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lift focus:outline-none focus:ring-2 focus:ring-brand/40"
    >
      {/* category accent bar */}
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: cat.marker }}
        aria-hidden
      />

      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cat.chip}`}
        >
          <span aria-hidden>{cat.emoji}</span>
          {cat.label}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sev.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
          {sev.label}
        </span>
      </div>

      <h3 className="mb-4 line-clamp-2 text-[15px] font-bold leading-snug text-ink">
        {cluster.label}
      </h3>

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-baseline gap-1">
            <span className="text-base font-bold text-ink">{cluster.complaint_count}</span>
            <span className="text-xs text-ink-muted">reports</span>
          </span>
          <span className="flex items-baseline gap-1">
            <span className="text-base font-bold text-ink">{cluster.citizen_count}</span>
            <span className="text-xs text-ink-muted">citizens</span>
          </span>
        </div>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-ink-muted transition group-hover:bg-brand group-hover:text-white">
          →
        </span>
      </div>

      {mixed && (
        <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand-dark ring-1 ring-brand/20">
          <span className="rounded bg-white/70 px-1 text-[10px]">हिं</span>
          <span className="rounded bg-white/70 px-1 text-[10px]">EN</span>
          merged across languages
        </div>
      )}
    </button>
  );
}
