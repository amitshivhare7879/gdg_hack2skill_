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
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition active:scale-95 ${
              selected
                ? "border-brand bg-brand-light shadow-glow"
                : "border-slate-200 bg-white hover:border-brand/40 hover:bg-slate-50"
            }`}
          >
            <span className={`text-2xl transition-transform ${selected ? "scale-110" : ""}`} aria-hidden>
              {meta.emoji}
            </span>
            <span className="text-xs font-semibold text-ink">
              {lang === "hi" ? meta.labelHi : meta.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
