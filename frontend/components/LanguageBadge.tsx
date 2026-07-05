import type { Language } from "@/lib/types";
import { LANGUAGE_BADGE } from "@/lib/ui";

export default function LanguageBadge({ lang }: { lang: Language }) {
  const b = LANGUAGE_BADGE[lang] ?? LANGUAGE_BADGE.en;
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none ${b.className}`}
      title={lang === "hi" ? "Hindi" : "English"}
    >
      {b.text}
    </span>
  );
}
