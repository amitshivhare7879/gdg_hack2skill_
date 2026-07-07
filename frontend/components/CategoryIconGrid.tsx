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
    <div className="grid grid-cols-4 gap-2">
      {CATEGORIES.map((cat) => {
        const meta = CATEGORY_META[cat];
        const selected = value === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            aria-pressed={selected}
            className={`flex flex-col items-center justify-center rounded border p-2.5 transition active:scale-95 text-center ${
              selected
                ? "border-brand bg-brand-light/30 text-brand font-bold"
                : "border-slate-200 bg-white text-ink-soft hover:bg-slate-50 hover:border-slate-350"
            }`}
          >
            <span className="text-[9px] font-bold uppercase tracking-widest font-sans">
              {lang === "hi" ? meta.labelHi : meta.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
