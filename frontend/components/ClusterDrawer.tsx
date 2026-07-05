"use client";

import { useEffect } from "react";
import type { Cluster } from "@/lib/types";
import { mediaUrl } from "@/lib/api";
import { categoryMeta, severityMeta, RELATION_LABEL } from "@/lib/ui";
import LanguageBadge from "./LanguageBadge";

export default function ClusterDrawer({
  cluster,
  onClose,
}: {
  cluster: Cluster | null;
  onClose: () => void;
}) {
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
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
        style={{ animation: "fade-up 0.2s ease both" }}
      />
      <aside
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-slate-50 shadow-2xl"
        style={{ animation: "pop-in 0.28s cubic-bezier(0.2,0.8,0.2,1) both" }}
      >
        {/* Gradient header band */}
        <div className="sticky top-0 z-10">
          <div
            className="h-1.5 w-full"
            style={{ background: cat.marker }}
            aria-hidden
          />
          <div className="border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cat.chip}`}>
                  <span aria-hidden>{cat.emoji}</span>
                  {cat.label}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sev.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                  {sev.label} severity
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-slate-100 hover:text-ink"
              >
                ✕
              </button>
            </div>
            <h2 className="text-lg font-extrabold leading-snug text-ink">{cluster.label}</h2>
            <div className="mt-2 flex items-center gap-3 text-sm text-ink-muted">
              <span>
                <span className="font-bold text-ink">{cluster.complaint_count}</span> reports
              </span>
              <span className="text-slate-300">·</span>
              <span>
                <span className="font-bold text-ink">{cluster.citizen_count}</span> unique citizens
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5">
          {/* Corroboration */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-muted">
              <span className="text-brand">◆</span> Why this severity
            </h3>
            <p className="rounded-xl border border-slate-200 bg-white p-3.5 text-sm leading-relaxed text-ink-soft">
              {cluster.severity_rationale}
            </p>
          </section>

          {/* Complaints — the mixed-language money shot */}
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-muted">
              Reports in this cluster
            </h3>
            <ul className="space-y-2.5">
              {cluster.complaints.map((c) => {
                const src = mediaUrl(c.photo_url);
                return (
                  <li key={c.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-card">
                    <div className="pt-0.5">
                      <LanguageBadge lang={c.original_language} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed text-ink">{c.text}</p>
                      {c.has_photo && src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt={`Photo attached to report ${c.id}`}
                          className="mt-2 h-24 w-32 rounded-lg object-cover ring-1 ring-slate-200"
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Related clusters — causal inference */}
          {cluster.related.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-muted">
                Related issues
              </h3>
              <ul className="space-y-2.5">
                {cluster.related.map((r) => (
                  <li key={r.cluster_id} className="rounded-xl border border-brand/25 bg-gradient-to-br from-brand-light/60 to-white p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white" aria-hidden>→</span>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-brand-dark">
                        {RELATION_LABEL[r.relation] ?? r.relation}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-bold text-ink">{r.label}</div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{r.explanation}</p>
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
