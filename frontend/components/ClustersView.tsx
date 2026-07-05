"use client";

import { useCallback, useEffect, useState } from "react";
import type { Cluster, ClusterStats } from "@/lib/types";
import { getClusters } from "@/lib/api";
import StatBar from "./StatBar";
import ClusterCard from "./ClusterCard";
import ClusterDrawer from "./ClusterDrawer";
import PageHeader from "./PageHeader";
import LoadMore from "./LoadMore";
import { CardGridSkeleton, EmptyState, ErrorState } from "./States";

const PAGE_SIZE = 9;

export default function ClustersView({ locality }: { locality?: string }) {
  const [items, setItems] = useState<Cluster[] | null>(null);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ClusterStats>({ complaints: 0, citizens: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Cluster | null>(null);

  // First page (also re-runs whenever the locality filter changes).
  const load = useCallback(() => {
    setItems(null);
    setError(null);
    getClusters({ locality, limit: PAGE_SIZE, offset: 0 })
      .then((page) => {
        setItems(page.items);
        setTotal(page.total);
        setStats(page.stats);
      })
      .catch((e: Error) => setError(e.message));
  }, [locality]);

  useEffect(load, [load]);

  const loadMore = useCallback(() => {
    if (!items) return;
    setLoadingMore(true);
    getClusters({ locality, limit: PAGE_SIZE, offset: items.length })
      .then((page) => {
        setItems((prev) => [...(prev ?? []), ...page.items]);
        setTotal(page.total);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingMore(false));
  }, [items, locality]);

  return (
    <div>
      <PageHeader
        eyebrow="MP Dashboard"
        title="Clustered civic issues"
        subtitle="Duplicate reports are merged across Hindi and English into single, corroborated issues — ranked by real demand, not by who shouts loudest."
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items === null ? (
        <CardGridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="No complaints for this locality yet"
          hint="Try another locality, or submit the first report."
        />
      ) : (
        <>
          <StatBar complaints={stats.complaints} issues={total} citizens={stats.citizens} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c, i) => (
              <div
                key={c.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min((i % PAGE_SIZE) * 40, 360)}ms` }}
              >
                <ClusterCard cluster={c} onOpen={setSelected} />
              </div>
            ))}
          </div>
          <LoadMore
            shown={items.length}
            total={total}
            loading={loadingMore}
            onClick={loadMore}
            label="Load more issues"
          />
        </>
      )}

      <ClusterDrawer cluster={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
