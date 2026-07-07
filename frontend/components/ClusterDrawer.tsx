"use client";

import { useEffect, useState } from "react";
import type { Cluster, Project } from "@/lib/types";
import { mediaUrl, getPriorities } from "@/lib/api";
import { categoryMeta, severityMeta, RELATION_LABEL } from "@/lib/ui";
import LanguageBadge from "./LanguageBadge";
import Link from "next/link";

export default function ClusterDrawer({
  cluster,
  onClose,
}: {
  cluster: Cluster | null;
  onClose: () => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    getPriorities()
      .then(setProjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (cluster) {
      window.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
      };
    }
  }, [cluster, onClose]);

  if (!cluster) return null;
  const cat = categoryMeta(cluster.category);
  const sev = severityMeta(cluster.severity);

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-ink/30"
        onClick={onClose}
        aria-hidden
        style={{ animation: "fade-up 0.2s ease both" }}
      />
      <aside
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white border-l border-slate-250"
        style={{ animation: "pop-in 0.28s cubic-bezier(0.2,0.8,0.2,1) both" }}
      >
        {/* Header section */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                {cat.label}
              </span>
              <span className="text-slate-300">·</span>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${cluster.severity === "high" ? "text-brand" : "text-ink-soft"}`}>
                {sev.label} Severity
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-ink-muted hover:text-ink text-xs font-bold uppercase tracking-wider p-1"
            >
              Close
            </button>
          </div>
          <h2 className="text-base font-bold leading-snug text-ink font-heading">{cluster.label}</h2>
          <div className="mt-3 flex items-center gap-3 text-xs text-ink-muted">
            <span className="flex items-center gap-1">
              <span className="font-bold text-ink font-mono">{cluster.complaint_count}</span> complaints
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-ink font-mono">{cluster.citizen_count}</span> unique citizens
            </span>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* Rationale */}
          <section className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Severity Analysis
            </h3>
            <p className="rounded border border-slate-200 bg-slate-50/50 p-4 text-xs leading-relaxed text-ink-soft">
              {cluster.severity_rationale}
            </p>
          </section>

          {/* Complaints list */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Corroborated Reports
            </h3>
            <ul className="space-y-3">
              {cluster.complaints.map((c) => {
                const src = mediaUrl(c.photo_url);
                return (
                  <li key={c.id} className="flex flex-col gap-3 rounded border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <LanguageBadge lang={c.original_language} />
                      <span className="text-[9px] font-mono text-ink-muted">{new Date(c.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-relaxed text-ink-soft">{c.text}</p>
                      {c.has_photo && src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt={`Photo attached to report ${c.id}`}
                          className="mt-3 h-28 w-full rounded object-cover border border-slate-200"
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Related clusters */}
          {cluster.related.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                Causal Relationships
              </h3>
              <ul className="space-y-3">
                {cluster.related.map((r) => (
                  <li key={r.cluster_id} className="rounded border border-slate-250 bg-slate-50/50 p-4">
                    <div className="flex items-center gap-1.5">
                      <span className="border border-slate-350 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-ink-soft bg-white">
                        {RELATION_LABEL[r.relation] ?? r.relation}
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-bold text-ink font-heading">{r.label}</div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">{r.explanation}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Proposed Municipal Resolutions */}
          {projects.filter((p) => p.linked_cluster_ids.includes(cluster.id)).length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                Proposed Municipal Resolutions
              </h3>
              <ul className="space-y-3">
                {projects
                  .filter((p) => p.linked_cluster_ids.includes(cluster.id))
                  .map((p) => (
                    <li key={p.id} className="rounded border border-slate-250 bg-slate-50/50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="border border-brand/40 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-brand bg-brand-light/30 rounded-sm">
                          Proposed Project
                        </span>
                        <span className="text-[9px] font-bold text-ink-soft font-mono">
                          Score: {Math.round((p.demand_score + p.severity_score + p.feasibility_score) / 3)}/100
                        </span>
                      </div>
                      <div className="mt-2 text-xs font-bold text-ink font-heading">{p.title}</div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">{p.severity_evidence}</p>
                      <Link
                        href="/dashboard/priorities"
                        onClick={onClose}
                        className="mt-3.5 inline-block text-[9px] font-bold text-brand uppercase tracking-widest hover:underline"
                      >
                        View Priority Weights & Rank
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
