"use client";

export default function LoadMore({
  shown,
  total,
  loading,
  onClick,
  label = "Load more",
}: {
  shown: number;
  total: number;
  loading: boolean;
  onClick: () => void;
  label?: string;
}) {
  const remaining = Math.max(0, total - shown);

  if (remaining === 0) {
    return (
      <p className="mt-6 text-center text-xs font-medium text-ink-muted">
        Showing all {total}
      </p>
    );
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:border-brand/40 hover:bg-brand-light/40 disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            Loading…
          </>
        ) : (
          <>
            {label}
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-ink-muted">
              +{Math.min(remaining, 100)}
            </span>
          </>
        )}
      </button>
      <span className="text-xs font-medium text-ink-muted">
        Showing {shown} of {total}
      </span>
    </div>
  );
}
