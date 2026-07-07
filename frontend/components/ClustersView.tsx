"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Cluster, ClusterStats, Locality } from "@/lib/types";
import { getClusters, getLocalities } from "@/lib/api";
import StatBar from "./StatBar";
import ClusterCard from "./ClusterCard";
import ClusterDrawer from "./ClusterDrawer";
import PageHeader from "./PageHeader";
import LoadMore from "./LoadMore";
import { CardGridSkeleton, EmptyState, ErrorState } from "./States";

const PAGE_SIZE = 8;

export default function ClustersView({ locality }: { locality?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [items, setItems] = useState<Cluster[] | null>(null);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ClusterStats>({ complaints: 0, citizens: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Cluster | null>(null);
  const [localities, setLocalities] = useState<Locality[]>([]);

  // Fetch localities list once
  useEffect(() => {
    getLocalities()
      .then(setLocalities)
      .catch(() => {});
  }, []);

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

  const handleSelectLocality = (slug: string) => {
    const next = new URLSearchParams(params.toString());
    if (slug) next.set("locality", slug);
    else next.delete("locality");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const activeLocality = localities.find((l) => l.slug === locality);

  return (
    <div>
      <PageHeader
        eyebrow="District Intelligence"
        title="Civic Issue Clusters"
        subtitle="Citizen voice inputs are processed, translated, and grouped semantically into consolidated problem clusters. Select a ward in the left panel to filter."
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items === null ? (
        <CardGridSkeleton />
      ) : (
        <div className="grid gap-6 md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr_300px]">
          {/* Column 1: Left Rail (Ward Directory) */}
          <div className="space-y-4">
            <div className="rounded border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                Indore Wards
              </h3>
              <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1 text-xs">
                <button
                  onClick={() => handleSelectLocality("")}
                  className={`w-full text-left px-2.5 py-1.5 transition rounded font-bold text-[11px] ${
                    !locality
                      ? "bg-slate-900 text-white"
                      : "text-ink hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  All Indore Wards
                </button>
                {localities.map((l) => {
                  const active = l.slug === locality;
                  return (
                    <button
                      key={l.slug}
                      onClick={() => handleSelectLocality(l.slug)}
                      className={`w-full text-left px-2.5 py-1.5 transition rounded flex justify-between items-center text-[11px] ${
                        active
                          ? "bg-brand text-white font-bold"
                          : "text-ink hover:bg-slate-100 border border-transparent"
                      }`}
                    >
                      <span className="truncate mr-2">{l.name}</span>
                      <span className={`text-[9px] font-mono shrink-0 ${active ? "text-white/80" : "text-ink-muted"}`}>
                        {l.population >= 1000 ? `${(l.population / 1000).toFixed(0)}k` : l.population}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Center Feed */}
          <div className="space-y-6">
            <StatBar complaints={stats.complaints} issues={total} citizens={stats.citizens} />

            {items.length === 0 ? (
              <EmptyState
                title="No active issues for this locality yet"
                hint="Try switching the locality or report a new issue to get started."
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          {/* Sidebar Insights column */}
          <aside className="space-y-6">
            <div className="rounded border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                Area Profile
              </h3>
              {activeLocality ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[15px] font-bold text-ink font-heading">{activeLocality.name}</h4>
                    <p className="text-[9px] font-bold uppercase text-ink-muted mt-0.5">Indore Municipal Ward</p>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between py-2.5">
                      <span className="font-semibold text-ink-muted">Population</span>
                      <span className="font-bold text-ink font-mono">{activeLocality.population.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="font-semibold text-ink-muted">Literacy Rate</span>
                      <span className="font-bold text-ink font-mono">{activeLocality.literacy_rate}%</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="font-semibold text-ink-muted">Mobile Coverage</span>
                      <span className="font-bold text-ink font-mono">{activeLocality.connectivity_rate}%</span>
                    </div>
                    <div className="flex justify-between py-2.5 border-t border-slate-100 mt-2 pt-2">
                      <span className="font-semibold text-ink-muted">Active Clusters</span>
                      <span className="font-bold text-brand font-mono">{total}</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="font-semibold text-ink-muted">Total Reports</span>
                      <span className="font-bold text-ink font-mono">{stats.complaints}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[15px] font-bold text-ink font-heading">Indore District</h4>
                    <p className="text-[9px] font-bold uppercase text-ink-muted mt-0.5">All Wards Monitored</p>
                  </div>
                  <p className="text-xs leading-relaxed text-ink-soft">
                    Select a specific ward or area using the filter dropdown above to load demographic data and localized reporting density metrics.
                  </p>
                  <div className="divide-y divide-slate-100 text-xs pt-2">
                    <div className="flex justify-between py-2.5">
                      <span className="font-semibold text-ink-muted">Total Wards</span>
                      <span className="font-bold text-ink font-mono">{localities.length} Wards</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="font-semibold text-ink-muted">Intake Channels</span>
                      <span className="font-bold text-ink">Hindi / English Voice</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                Merger Engine
              </h3>
              <p className="text-xs leading-relaxed text-ink-muted">
                JanVikas AI automatically aggregates incoming duplicate citizen complaints across Hindi voice transcripts and English text.
              </p>
            </div>
          </aside>
        </div>
      )}

      <ClusterDrawer cluster={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
