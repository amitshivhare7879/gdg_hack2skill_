"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/map", label: "Map" },
  { href: "/dashboard/priorities", label: "Priorities" },
  { href: "/dashboard/outbox", label: "Outbox" },
];

export default function HeaderNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const locality = params.get("locality");
  const suffix = locality ? `?locality=${encodeURIComponent(locality)}` : "";

  return (
    <div className="flex items-center gap-1.5 lg:gap-3 text-xs font-bold uppercase tracking-wider">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={`${t.href}${suffix}`}
            className={`px-3 py-2 transition-colors border-b-2 ${
              active
                ? "text-ink border-ink"
                : "text-ink-muted hover:text-ink border-transparent"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
      <Link
        href="/submit"
        className="ml-2 rounded border border-brand bg-brand text-white px-4 py-2 shadow-sm transition hover:bg-brand-dark active:scale-[0.98]"
      >
        Report an Issue
      </Link>
    </div>
  );
}
