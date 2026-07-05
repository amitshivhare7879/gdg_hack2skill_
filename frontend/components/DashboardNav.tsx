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
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
      <nav className="flex gap-1">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={`${t.href}${suffix}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-brand-light text-brand-dark"
                  : "text-gray-600 hover:bg-gray-100 hover:text-ink"
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
