"use client";

import type { Category, Language } from "@/lib/types";
import { CATEGORIES, CATEGORY_META } from "@/lib/ui";

export default function CategoryIconGrid({
  value,
  onChange,
  lang,
}: {
  value: Category | "";
  onChange: (c: Category) => void;
  lang: Language;
}) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {CATEGORIES.map((cat) => {
        const meta = CATEGORY_META[cat];
        const selected = value === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            aria-pressed={selected}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition ${
              selected
                ? "border-brand bg-brand-light"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {meta.emoji}
            </span>
            <span className="text-xs font-medium text-ink">
              {lang === "hi" ? meta.labelHi : meta.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
