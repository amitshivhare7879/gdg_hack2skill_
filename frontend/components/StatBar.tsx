function StatCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="border border-slate-200 bg-white p-4 rounded">
      <div className="text-2xl font-extrabold leading-none tracking-tight text-ink font-heading">
        {value}
      </div>
      <div className="mt-1.5 text-[9px] font-bold uppercase tracking-widest text-ink-muted">
        {label}
      </div>
    </div>
  );
}

// Totals come from the backend aggregate (full filtered set) so the bar stays
// accurate even when the cluster grid below is paginated.
export default function StatBar({
  complaints,
  issues,
  citizens,
}: {
  complaints: number;
  issues: number;
  citizens: number;
}) {
  const dedup =
    complaints > 0 ? Math.round(((complaints - citizens) / complaints) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard value={String(complaints)} label="Total Complaints" />
      <StatCard value={String(issues)} label="Merged Issues" />
      <StatCard value={String(citizens)} label="Citizens Affected" />
      <StatCard value={`${dedup}%`} label="De-duplication" />
    </div>
  );
}
