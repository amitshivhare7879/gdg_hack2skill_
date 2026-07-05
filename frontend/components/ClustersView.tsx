"use client";

import { useCallback, useEffect, useState } from "react";
import type { Cluster } from "@/lib/types";
import { getClusters } from "@/lib/api";
import StatBar from "./StatBar";
import ClusterCard from "./ClusterCard";
import ClusterDrawer from "./ClusterDrawer";
import { CardGridSkeleton, EmptyState, ErrorState } from "./States";

export default function ClustersView({ locality }: { locality?: string }) {
  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Cluster | null>(null);

  const load = useCallback(() => {
    setClusters(null);
    setError(null);
    getClusters(locality)
      .then(setClusters)
      .catch((e: Error) => setError(e.message));
  }, [locality]);

  useEffect(load, [load]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink">Clustered civic issues</h1>
        <p className="text-sm text-gray-500">
          Duplicate reports merged across Hindi and English into single issues.
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : clusters === null ? (
        <CardGridSkeleton />
      ) : clusters.length === 0 ? (
        <EmptyState
          title="No complaints for this locality yet"
          hint="Try another locality, or submit the first report."
        />
      ) : (
        <>
          <StatBar clusters={clusters} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clusters.map((c) => (
              <ClusterCard key={c.id} cluster={c} onOpen={setSelected} />
            ))}
          </div>
        </>
      )}

      <ClusterDrawer cluster={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
