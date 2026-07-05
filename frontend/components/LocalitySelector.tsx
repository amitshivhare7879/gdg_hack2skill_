"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Locality } from "@/lib/types";
import { getLocalities } from "@/lib/api";

// Drives the ?locality= URL param — shareable state, no context/store (F2).
export default function LocalitySelector() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("locality") ?? "";
  const [localities, setLocalities] = useState<Locality[]>([]);

  useEffect(() => {
    getLocalities()
      .then(setLocalities)
      .catch(() => setLocalities([]));
  }, []);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const slug = e.target.value;
    const next = new URLSearchParams(params.toString());
    if (slug) next.set("locality", slug);
    else next.delete("locality");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden font-medium text-ink-muted sm:inline">📍 Locality</span>
      <select
        value={current}
        onChange={onChange}
        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink shadow-card transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        <option value="">All localities</option>
        {localities.map((l) => (
          <option key={l.slug} value={l.slug}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
