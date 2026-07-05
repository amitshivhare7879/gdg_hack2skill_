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
      className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-brand/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand/40"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cat.chip}`}>
          <span aria-hidden>{cat.emoji}</span>
          {cat.label}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sev.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
          {sev.label}
        </span>
      </div>

      <h3 className="mb-3 line-clamp-2 font-semibold leading-snug text-ink">
        {cluster.label}
      </h3>

      <div className="mt-auto flex items-center gap-3 text-sm text-gray-600">
        <span className="font-medium text-ink">{cluster.complaint_count}</span>
        <span>complaints</span>
        <span className="text-gray-300">·</span>
        <span className="font-medium text-ink">{cluster.citizen_count}</span>
        <span>citizens</span>
      </div>

      {mixed && (
        <div className="mt-2 text-[11px] font-medium text-brand-dark">
          हिं + EN — merged across languages
        </div>
      )}
    </button>
  );
}
