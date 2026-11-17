import type { Metadata } from "next";
import "./globals.css";
import { Nav, Footer } from "@/components/ui";

export const metadata: Metadata = {
  title: "Funding Radar — Investors who already back companies like yours",
  description:
    "Describe your startup and get a ranked list of investors to approach: built from a TinySet dataset of similar companies that raised in the last 18 months, with proof links, cheque sizes, partners and contact routes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink font-sans text-slate-200 antialiased">
        <Nav />
        <main className="mx-auto w-full max-w-6xl px-3 pb-20 pt-8 sm:px-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
