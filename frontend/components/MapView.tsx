"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Cluster, Hotspot } from "@/lib/types";
import { getClusters, getHotspots } from "@/lib/api";
import ClusterDrawer from "./ClusterDrawer";
import { EmptyState, ErrorState, Skeleton } from "./States";

// Leaflet touches `window` at import time — must be client-only.
const HotspotMap = dynamic(() => import("./HotspotMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[520px] w-full" />,
});

export default function MapView() {
  const [hotspots, setHotspots] = useState<Hotspot[] | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Cluster | null>(null);

  const load = useCallback(() => {
    setHotspots(null);
    setError(null);
    Promise.all([getHotspots(), getClusters()])
      .then(([h, c]) => {
        setHotspots(h);
        setClusters(c);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const byId = useMemo(() => {
    const m = new Map<string, Cluster>();
    clusters.forEach((c) => m.set(c.id, c));
    return m;
  }, [clusters]);

  const onSelect = useCallback(
    (clusterId: string) => {
      const c = byId.get(clusterId);
      if (c) setSelected(c);
    },
    [byId],
  );

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink">Hotspot map — Indore</h1>
        <p className="text-sm text-gray-500">
          Circle size = complaint volume, colour = category. Click a hotspot for details.
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : hotspots === null ? (
        <Skeleton className="h-[520px] w-full" />
      ) : hotspots.length === 0 ? (
        <EmptyState title="No hotspots to map yet" />
      ) : (
        <HotspotMap hotspots={hotspots} onSelect={onSelect} />
      )}

      <ClusterDrawer cluster={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
