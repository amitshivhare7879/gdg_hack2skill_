"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Cluster, Project } from "@/lib/types";
import { getPriorities, getClusters } from "@/lib/api";
import { applyWeights, DEFAULT_WEIGHTS, type Weights } from "@/lib/scoring";
import WeightSliders from "./WeightSliders";
import PriorityCard from "./PriorityCard";
import PageHeader from "./PageHeader";
import { EmptyState, ErrorState, Skeleton } from "./States";

export default function PrioritiesView() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS });

  const load = useCallback(() => {
    setProjects(null);
    setError(null);
    Promise.all([getPriorities(), getClusters()])
      .then(([p, page]) => {
        setProjects(p);
        setClusters(page.items);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  // Pure client-side re-sort on every slider change — zero network calls.
  const ranked = useMemo(
    () => (projects ? applyWeights(projects, weights) : []),
    [projects, weights],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Decision support"
        title="Proposed projects, ranked"
        subtitle="Move the weights — the ranking re-sorts instantly. The backend returns raw component scores; you own the trade-off between demand, severity and feasibility."
      />

      <div className="space-y-6">
        <WeightSliders weights={weights} onChange={setWeights} />

        <div>
          {error ? (
            <ErrorState message={error} onRetry={load} />
          ) : projects === null ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : ranked.length === 0 ? (
            <EmptyState title="No proposed projects yet" />
          ) : (
            <div className="space-y-3">
              {ranked.map((p, i) => (
                <PriorityCard key={p.id} project={p} rank={i + 1} clusters={clusters} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
