import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JanVikas AI — Civic Intelligence for Indore",
  description:
    "Citizens report civic issues by voice in Hindi or English; AI clusters, corroborates and ranks them for the MP's office.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans text-ink antialiased">
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/dashboard" className="group flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-lg font-bold text-white shadow-glow transition-transform group-hover:scale-105">
                जन
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[15px] font-extrabold tracking-tight text-ink">
                  JanVikas<span className="text-gradient"> AI</span>
                </span>
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-ink-muted">
                  Civic Intelligence
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-1.5 text-sm">
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 font-medium text-ink-soft transition hover:bg-slate-100 hover:text-ink"
              >
                Dashboard
              </Link>
              <Link
                href="/submit"
                className="rounded-lg bg-brand-gradient px-4 py-1.5 font-semibold text-white shadow-glow transition hover:brightness-105 active:scale-95"
              >
                Report an issue
              </Link>
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

        <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6">
          <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-6 text-xs text-ink-muted sm:flex-row">
            <p>
              <span className="font-semibold text-ink-soft">JanVikas AI</span> ·
              Civic intelligence for Indore
            </p>
            <p>Voice-first · Hindi &amp; English · Equity-aware prioritisation</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
