import type { Cluster } from "@/lib/types";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 px-4 py-3">
      <div className="text-2xl font-semibold text-ink">{value}</div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}

export default function StatBar({ clusters }: { clusters: Cluster[] }) {
  const complaints = clusters.reduce((s, c) => s + c.complaint_count, 0);
  const citizens = clusters.reduce((s, c) => s + c.citizen_count, 0);
  const clusterCount = clusters.length;
  // "duplicates merged": complaints that collapsed into shared issues.
  const dedup =
    complaints > 0 ? Math.round(((complaints - citizens) / complaints) * 100) : 0;

  return (
    <div className="mb-6 flex flex-wrap divide-x divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
      <Stat value={String(complaints)} label="Complaints" />
      <Stat value={String(clusterCount)} label="Issues (clustered)" />
      <Stat value={String(citizens)} label="Unique citizens" />
      <Stat value={`${dedup}%`} label="Duplicates merged" />
    </div>
  );
}
