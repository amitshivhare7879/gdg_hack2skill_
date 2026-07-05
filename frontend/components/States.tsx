// Loading / empty / error primitives — every data view uses these (RULES.md #3).

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-xl bg-slate-200/70 ${className}`} />;
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card"
        >
          <div className="mb-3 flex justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-4 h-4 w-2/3" />
          <Skeleton className="h-5 w-32" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-20 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
        🗂️
      </span>
      <p className="font-semibold text-ink-soft">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50/70 px-6 py-16 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-2xl">
        ⚠️
      </span>
      <p className="font-bold text-red-700">Something went wrong</p>
      <p className="mt-1 text-sm text-red-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-card ring-1 ring-red-200 transition hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}
