// Shared display constants: category palette + labels + emoji, severity colors.
// Category chips use a MUTED palette (design direction); severity uses its own
// semantic green/amber/red. The saffron brand accent is never used here.

import type { Category, Language, Severity } from "./types";

export const CATEGORIES: Category[] = [
  "water",
  "roads",
  "electricity",
  "education",
  "health",
  "sanitation",
  "safety",
  "other",
];

export const CATEGORY_META: Record<
  Category,
  { label: string; labelHi: string; emoji: string; chip: string; marker: string }
> = {
  water: { label: "Water", labelHi: "पानी", emoji: "💧", chip: "bg-sky-100 text-sky-800", marker: "#0284c7" },
  roads: { label: "Roads", labelHi: "सड़क", emoji: "🛣️", chip: "bg-stone-200 text-stone-800", marker: "#57534e" },
  electricity: { label: "Electricity", labelHi: "बिजली", emoji: "💡", chip: "bg-amber-100 text-amber-800", marker: "#d97706" },
  education: { label: "Education", labelHi: "शिक्षा", emoji: "🏫", chip: "bg-indigo-100 text-indigo-800", marker: "#4f46e5" },
  health: { label: "Health", labelHi: "स्वास्थ्य", emoji: "🏥", chip: "bg-rose-100 text-rose-800", marker: "#e11d48" },
  sanitation: { label: "Sanitation", labelHi: "सफाई", emoji: "🚽", chip: "bg-lime-100 text-lime-800", marker: "#65a30d" },
  safety: { label: "Safety", labelHi: "सुरक्षा", emoji: "🛡️", chip: "bg-purple-100 text-purple-800", marker: "#9333ea" },
  other: { label: "Other", labelHi: "अन्य", emoji: "📌", chip: "bg-gray-200 text-gray-700", marker: "#6b7280" },
};

export function categoryMeta(cat: string) {
  return CATEGORY_META[(cat as Category)] ?? CATEGORY_META.other;
}

export const SEVERITY_META: Record<
  Severity,
  { label: string; badge: string; dot: string; ring: string }
> = {
  low: { label: "Low", badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500", ring: "ring-emerald-200" },
  medium: { label: "Medium", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500", ring: "ring-amber-200" },
  high: { label: "High", badge: "bg-red-100 text-red-700", dot: "bg-red-500", ring: "ring-red-200" },
};

export function severityMeta(sev: string) {
  return SEVERITY_META[(sev as Severity)] ?? SEVERITY_META.medium;
}

export const LANGUAGE_BADGE: Record<Language, { text: string; className: string }> = {
  hi: { text: "हिं", className: "bg-white text-ink border border-slate-200" },
  en: { text: "EN", className: "bg-white text-ink border border-slate-200" },
};

export const RELATION_LABEL: Record<string, string> = {
  causes: "causes",
  contributes_to: "contributes to",
  related_to: "related to",
};
