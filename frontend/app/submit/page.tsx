"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Category, Language, Locality } from "@/lib/types";
import type { ComplaintResponse } from "@/lib/types";
import { getLocalities, submitComplaint } from "@/lib/api";
import CategoryIconGrid from "@/components/CategoryIconGrid";
import VoiceInput from "@/components/VoiceInput";

// Two hardcoded string maps — no i18n lib (F6). Hindi is the default.
const STRINGS = {
  hi: {
    title: "अपनी समस्या दर्ज करें",
    subtitle: "आवाज़ में बोलें या टाइप करें — हिंदी या अंग्रेज़ी में",
    langLabel: "भाषा",
    describe: "समस्या बताएं",
    placeholder: "जैसे: स्ट्रीट लाइट तीन हफ्ते से खराब है",
    category: "श्रेणी चुनें",
    locality: "क्षेत्र",
    selectLocality: "क्षेत्र चुनें",
    phone: "फ़ोन नंबर (वैकल्पिक)",
    phoneHint: "अपडेट पाने के लिए — किसी को दिखाया नहीं जाता",
    photo: "फ़ोटो जोड़ें (वैकल्पिक)",
    submit: "शिकायत भेजें",
    submitting: "भेजा जा रहा है…",
    successTitle: "शिकायत दर्ज हो गई!",
    another: "एक और शिकायत दर्ज करें",
    viewDashboard: "डैशबोर्ड देखें",
    errText: "कृपया अपनी समस्या बताएं",
    errCategory: "कृपया एक श्रेणी चुनें",
    errLocality: "कृपया क्षेत्र चुनें",
  },
  en: {
    title: "Report your issue",
    subtitle: "Speak or type — in Hindi or English",
    langLabel: "Language",
    describe: "Describe the issue",
    placeholder: "e.g. Street light has been broken for three weeks",
    category: "Pick a category",
    locality: "Locality",
    selectLocality: "Select locality",
    phone: "Phone number (optional)",
    phoneHint: "To receive updates — never shown to anyone",
    photo: "Add a photo (optional)",
    submit: "Send complaint",
    submitting: "Sending…",
    successTitle: "Complaint recorded!",
    another: "Report another issue",
    viewDashboard: "View dashboard",
    errText: "Please describe your issue",
    errCategory: "Please pick a category",
    errLocality: "Please select a locality",
  },
} as const;

export default function SubmitPage() {
  const [lang, setLang] = useState<Language>("hi");
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [locality, setLocality] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [localities, setLocalities] = useState<Locality[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<ComplaintResponse | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const t = STRINGS[lang];

  useEffect(() => {
    getLocalities()
      .then(setLocalities)
      .catch(() => setLocalities([]));
  }, []);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setPhoto(e.target.files?.[0] ?? null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!text.trim()) return setFormError(t.errText);
    if (!category) return setFormError(t.errCategory);
    if (!locality) return setFormError(t.errLocality);

    setSubmitting(true);
    try {
      const res = await submitComplaint({
        text: text.trim(),
        original_language: lang,
        locality,
        category_hint: category,
        phone: phone.trim() || undefined,
        photo,
      });
      setResult(res);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setText("");
    setCategory("");
    setLocality("");
    setPhone("");
    setPhoto(null);
    setResult(null);
    setFormError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ---- Success screen ----
  if (result) {
    return (
      <div className="mx-auto max-w-md py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-ink">{t.successTitle}</h1>
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm">
          <p className="text-sm text-gray-500">
            {lang === "hi" ? "समूह" : "Grouped into"}
          </p>
          <p className="mt-1 font-semibold text-ink">{result.cluster_label}</p>
          <p className="mt-3 text-sm text-gray-600">{result.message}</p>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={reset}
            className="rounded-xl bg-brand py-3 font-semibold text-white hover:bg-brand-dark"
          >
            {t.another}
          </button>
          <Link
            href="/dashboard"
            className="rounded-xl border border-gray-300 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            {t.viewDashboard}
          </Link>
        </div>
      </div>
    );
  }

  // ---- Intake form ----
  return (
    <div className="mx-auto max-w-md py-2">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.subtitle}</p>
        </div>
        {/* Language toggle */}
        <div className="flex shrink-0 rounded-lg border border-gray-300 p-0.5 text-sm">
          {(["hi", "en"] as Language[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-md px-2.5 py-1 font-medium ${
                lang === l ? "bg-brand text-white" : "text-gray-600"
              }`}
            >
              {l === "hi" ? "हिंदी" : "EN"}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Voice + text */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            {t.describe}
          </label>
          <div className="mb-2">
            <VoiceInput lang={lang} onTranscript={(txt) => setText((p) => (p ? p + " " + txt : txt))} />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.placeholder}
            rows={3}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-2 block text-sm font-medium text-ink">
            {t.category}
          </label>
          <CategoryIconGrid value={category} onChange={setCategory} lang={lang} />
        </div>

        {/* Locality */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            {t.locality}
          </label>
          <select
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">{t.selectLocality}</option>
            {localities.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Phone */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            {t.phone}
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <p className="mt-1 text-xs text-gray-400">{t.phoneHint}</p>
        </div>

        {/* Photo */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            {t.photo}
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-light file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-dark"
          />
          {photoPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt="Selected photo preview"
              className="mt-2 h-32 w-full rounded-lg object-cover"
            />
          )}
        </div>

        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
        >
          {submitting ? t.submitting : t.submit}
        </button>
      </form>
    </div>
  );
}
