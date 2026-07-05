import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-lg font-bold text-white">
                जन
              </span>
              <span className="text-lg font-bold tracking-tight text-ink">
                JanVikas<span className="text-brand"> AI</span>
              </span>
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <Link
                href="/submit"
                className="rounded-md px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100 hover:text-ink"
              >
                Submit
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100 hover:text-ink"
              >
                Dashboard
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
