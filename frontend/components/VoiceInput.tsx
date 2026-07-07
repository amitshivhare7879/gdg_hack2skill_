"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types";

// Minimal Web Speech API typings (avoid `any` per RULES.md #5).
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const COPY = {
  hi: { start: "बोलकर बताएं", stop: "रिकॉर्डिंग बंद करें", unsupported: "इस ब्राउज़र में वॉइस उपलब्ध नहीं है" },
  en: { start: "Speak your complaint", stop: "Stop recording", unsupported: "Voice input isn't available in this browser" },
};

export default function VoiceInput({
  lang,
  onTranscript,
}: {
  lang: Language;
  onTranscript: (text: string) => void;
}) {
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => recRef.current?.stop();
  }, []);

  function toggle() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      if (text) onTranscript(text.trim());
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
    recRef.current = rec;
    setRecording(true);
    rec.start();
  }

  const copy = COPY[lang];
  if (!supported) {
    return <p className="text-xs text-gray-400">{copy.unsupported}</p>;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex w-full items-center justify-center gap-2 rounded border py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-150 ${
        recording
          ? "animate-pulse border-red-600 bg-red-600 text-white"
          : "border-slate-200 bg-slate-50 text-ink-soft hover:bg-slate-100 hover:border-slate-350"
      }`}
    >
      <span>
        {recording ? "Stop Recording" : "Start Voice Intake"}
      </span>
    </button>
  );
}
