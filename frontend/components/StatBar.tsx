function StatCard({
  value,
  label,
  icon,
  accent,
}: {
  value: string;
  label: string;
  icon: string;
  accent: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition hover:shadow-lift">
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10 blur-xl transition group-hover:opacity-20"
        style={{ background: accent }}
      />
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ background: `${accent}1a`, color: accent }}
          aria-hidden
        >
          {icon}
        </span>
        <div>
          <div className="text-2xl font-extrabold leading-none tracking-tight text-ink">
            {value}
          </div>
          <div className="mt-1 text-xs font-medium text-ink-muted">{label}</div>
        </div>
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
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard value={String(complaints)} label="Complaints filed" icon="📣" accent="#E07A2F" />
      <StatCard value={String(issues)} label="Distinct issues" icon="🧩" accent="#4F46E5" />
      <StatCard value={String(citizens)} label="Unique citizens" icon="👥" accent="#0EA5E9" />
      <StatCard value={`${dedup}%`} label="Duplicates merged" icon="🔗" accent="#059669" />
    </div>
  );
}
