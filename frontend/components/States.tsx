// Loading / empty / error primitives — every data view uses these.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded bg-slate-200/50 ${className}`} />;
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded border border-slate-200 bg-white p-4"
        >
          <div className="mb-3 flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-4 h-4 w-2/3" />
          <div className="flex justify-between border-t border-slate-100 pt-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center rounded border border-dashed border-slate-250 bg-white/40 px-6 py-16 text-center">
      <p className="font-semibold text-ink-soft text-sm">{title}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
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
    <div className="flex flex-col items-center rounded border border-red-200 bg-red-50/30 px-6 py-12 text-center">
      <p className="text-sm font-bold text-red-750">System Notice</p>
      <p className="mt-1 text-xs text-red-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded border border-red-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-700 hover:bg-red-50"
        >
          Retry Connection
        </button>
      )}
    </div>
  );
}
