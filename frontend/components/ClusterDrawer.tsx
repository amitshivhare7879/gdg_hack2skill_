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
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [cluster, onClose]);

  if (!cluster) return null;
  const cat = categoryMeta(cluster.category);
  const sev = severityMeta(cluster.severity);

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cat.chip}`}>
                <span aria-hidden>{cat.emoji}</span>
                {cat.label}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sev.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                {sev.label} severity
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <h2 className="text-lg font-semibold leading-snug text-ink">{cluster.label}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {cluster.complaint_count} complaints · {cluster.citizen_count} unique citizens
          </p>
        </div>

        <div className="space-y-6 px-5 py-5">
          {/* Corroboration */}
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Why this severity
            </h3>
            <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              {cluster.severity_rationale}
            </p>
          </section>

          {/* Complaints — the mixed-language money shot */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Reports in this cluster
            </h3>
            <ul className="space-y-3">
              {cluster.complaints.map((c) => {
                const src = mediaUrl(c.photo_url);
                return (
                  <li key={c.id} className="flex gap-3 rounded-md border border-gray-100 p-3">
                    <div className="pt-0.5">
                      <LanguageBadge lang={c.original_language} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{c.text}</p>
                      {c.has_photo && src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt={`Photo attached to report ${c.id}`}
                          className="mt-2 h-24 w-32 rounded object-cover"
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
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Related issues
              </h3>
              <ul className="space-y-3">
                {cluster.related.map((r) => (
                  <li key={r.cluster_id} className="rounded-md border border-brand/20 bg-brand-light/40 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-ink">
                      <span className="text-brand-dark" aria-hidden>→</span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-brand-dark">
                        {RELATION_LABEL[r.relation] ?? r.relation}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-ink">{r.label}</div>
                    <p className="mt-1 text-sm text-gray-600">{r.explanation}</p>
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
