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
      <div className="mx-auto max-w-md py-12 text-center animate-pop-in">
        <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded border border-slate-350 text-xs font-bold text-ink bg-slate-50">
          OK
        </div>
        <h1 className="text-xl font-bold text-ink font-heading">{t.successTitle}</h1>
        <div className="mt-6 overflow-hidden rounded border border-slate-200 bg-white text-left">
          <div className="p-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
              {lang === "hi" ? "समूह में जोड़ा गया" : "Consolidated group"}
            </p>
            <p className="mt-2 text-sm font-bold leading-snug text-ink font-heading">
              {result.cluster_label}
            </p>
            <p className="mt-3 rounded bg-slate-50 p-3 text-xs leading-relaxed text-ink-muted">
              {result.message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={reset}
            className="w-full rounded border border-brand bg-brand py-2.5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-brand-dark active:scale-[0.98]"
          >
            {t.another}
          </button>
          <Link
            href="/dashboard"
            className="w-full rounded border border-slate-200 bg-white py-2.5 text-[10px] font-bold uppercase tracking-widest text-ink-soft transition hover:bg-slate-50 text-center"
          >
            {t.viewDashboard}
          </Link>
        </div>
      </div>
    );
  }

  // ---- Intake form ----
  return (
    <div className="mx-auto max-w-5xl py-2 animate-fade-up">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Info Column */}
        <div className="flex flex-col justify-center space-y-6 lg:pr-6">
          <div>
            <div className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted leading-none">
              {lang === "hi" ? "नागरिक शिकायत" : "Citizen Intake Portal"}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-ink font-heading leading-tight">
              {t.title}
            </h1>
            <p className="mt-2 text-xs text-ink-muted leading-relaxed">
              {t.subtitle}
            </p>
          </div>

          <div className="space-y-4 rounded border border-slate-200 bg-white p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              {lang === "hi" ? "शिकायत प्रणाली कैसे काम करती है?" : "How the system works"}
            </h3>

            <div className="space-y-4 text-xs text-ink-soft">
              <div className="flex gap-3">
                <span className="font-mono font-bold text-ink-muted text-xs pt-0.5">01</span>
                <div>
                  <p className="font-bold text-ink-soft">{lang === "hi" ? "आवाज़ में बोलें" : "Voice-First Input"}</p>
                  <p className="text-ink-muted text-xs mt-0.5 font-normal leading-relaxed">{lang === "hi" ? "अपनी भाषा में बोलें। एआई खुद ही ट्रांसक्राइब और अनुवाद कर लेगा।" : "Tap record and speak naturally in Hindi or English. The AI handles the transcription."}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="font-mono font-bold text-ink-muted text-xs pt-0.5">02</span>
                <div>
                  <p className="font-bold text-ink-soft">{lang === "hi" ? "समान समस्याओं का विलीनिकरण" : "Automated Aggregation"}</p>
                  <p className="text-ink-muted text-xs mt-0.5 font-normal leading-relaxed">{lang === "hi" ? "आपकी शिकायत को आपके क्षेत्र की समान शिकायतों के साथ एक समूह में जोड़ दिया जाता है।" : "We group duplicate complaints into a single cluster to track total community demand."}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="font-mono font-bold text-ink-muted text-xs pt-0.5">03</span>
                <div>
                  <p className="font-bold text-ink-soft">{lang === "hi" ? "त्वरित कार्रवाई" : "Prioritized Action"}</p>
                  <p className="text-ink-muted text-xs mt-0.5 font-normal leading-relaxed">{lang === "hi" ? "समस्या का आकार और गंभीरता देखकर प्रशासन तुरंत समाधान के कदम उठाएगा।" : "The district office priorities actions based on evidence, density, and local needs."}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Column */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
              {lang === "hi" ? "विवरण भरें" : "Form Details"}
            </h2>
            {/* Language toggle */}
            <div className="flex rounded border border-slate-200 bg-white p-0.5 text-xs">
              {(["hi", "en"] as Language[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`rounded-sm px-2.5 py-1 font-bold transition ${
                    lang === l ? "bg-slate-900 text-white" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {l === "hi" ? "हिंदी" : "EN"}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded border border-slate-200 bg-white p-4"
          >
            {/* Voice + text */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                {t.describe}
              </label>
              <div className="relative">
                <VoiceInput lang={lang} onTranscript={(txt) => setText((p) => (p ? p + " " + txt : txt))} />
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.placeholder}
                rows={3}
                className="w-full rounded border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-ink transition focus:border-brand focus:bg-white focus:outline-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                {t.category}
              </label>
              <CategoryIconGrid value={category} onChange={setCategory} lang={lang} />
            </div>

            {/* Locality */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                {t.locality}
              </label>
              <select
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-ink transition focus:border-brand focus:bg-white focus:outline-none"
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
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                {t.phone}
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-ink transition focus:border-brand focus:bg-white focus:outline-none"
              />
              <p className="text-[9px] text-ink-muted leading-relaxed">{t.phoneHint}</p>
            </div>

            {/* Photo */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                {t.photo}
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onFile}
                className="block w-full text-xs text-ink-muted file:mr-3 file:rounded file:border file:border-slate-200 file:bg-slate-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-ink-soft hover:file:bg-slate-100 transition-colors"
              />
              {photoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Selected photo preview"
                  className="mt-3 h-36 w-full rounded object-cover border border-slate-200"
                />
              )}
            </div>

            {formError && (
              <p className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                <span>[ Notice ]</span> {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded border border-brand bg-brand py-2.5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? t.submitting : `${t.submit}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
