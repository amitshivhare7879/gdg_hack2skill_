import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import HeaderNav from "@/components/HeaderNav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Civic Rank — Civic Intelligence for Indore",
  description:
    "Citizens report civic issues by voice in Hindi or English; AI clusters, corroborates and ranks them for the MP's office.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerifDisplay.variable}`}>
      <body className="min-h-screen font-sans text-ink antialiased bg-[#fcfbf9]">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-[#fcfbf9]/95 backdrop-blur-md">
          <nav className="mx-auto flex max-w-[1440px] items-center justify-between px-6 lg:px-8 xl:px-10 py-4">
            <Link href="/dashboard" className="group flex flex-col leading-none">
              <span className="text-xl font-bold tracking-tight text-ink font-heading">
                Civic Rank
              </span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                Indore Civic Intelligence
              </span>
            </Link>

            <Suspense fallback={<div className="h-10 w-96 bg-slate-100 rounded animate-pulse" />}>
              <HeaderNav />
            </Suspense>
          </nav>
        </header>

        <main className="mx-auto max-w-[1440px] px-6 lg:px-8 xl:px-10 py-8">{children}</main>

        <footer className="mx-auto max-w-[1440px] px-6 lg:px-8 xl:px-10 pb-12 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 text-xs text-ink-muted sm:flex-row">
            <p className="font-semibold">
              <span className="text-ink-soft">Civic Rank</span> · Indore District Administration
            </p>
            <p className="flex items-center gap-2">
              <span>Voice Intake</span>
              <span className="text-slate-350">|</span>
              <span>Hindi &amp; English Processing</span>
              <span className="text-slate-355">|</span>
              <span>Equity Priorities</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
