"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

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
    <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-2">
      <nav className="flex gap-6">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={`${t.href}${suffix}`}
              className={`relative pb-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-150 border-b-2 ${
                active
                  ? "text-ink border-ink"
                  : "text-ink-muted hover:text-ink border-transparent"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
