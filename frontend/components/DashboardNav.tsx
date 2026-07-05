"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import LocalitySelector from "./LocalitySelector";

const TABS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/map", label: "Map" },
  { href: "/dashboard/priorities", label: "Priorities" },
  { href: "/dashboard/outbox", label: "Outbox" },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const locality = params.get("locality");
  const suffix = locality ? `?locality=${encodeURIComponent(locality)}` : "";

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <nav className="flex gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-card">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={`${t.href}${suffix}`}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                active
                  ? "bg-brand-gradient text-white shadow-glow"
                  : "text-ink-soft hover:bg-slate-100 hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <LocalitySelector />
    </div>
  );
}
