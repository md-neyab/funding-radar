import Link from "next/link";

export function RadarMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="13" stroke="#2DD4A7" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="8" stroke="#2DD4A7" strokeOpacity="0.55" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="3" fill="#2DD4A7" />
      <path d="M16 16 L26 7" stroke="#2DD4A7" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22.5" cy="11" r="2" fill="#38BDF8" />
    </svg>
  );
}

export function Nav() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line/70 bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Funding Radar home">
          <RadarMark />
          <span className="text-[17px] font-semibold tracking-tight text-white">
            Funding<span className="text-mint">Radar</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-panel2 hover:text-white">Find investors</Link>
          <Link href="/watchlist" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-panel2 hover:text-white">Saved</Link>
          <Link href="/methodology" className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-panel2 hover:text-white">Methodology</Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="no-print border-t border-line/70 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Funding Radar — find the investors who already back companies like yours. Every match carries its proof.</p>
        <p>
          Powered by{" "}
          <a className="text-slate-300 underline decoration-slate-600 underline-offset-2 hover:text-mint" href="https://tinyfish.ai" target="_blank" rel="noreferrer">
            TinyFish
          </a>{" "}
          TinySet, Search, Fetch &amp; Agent.
        </p>
      </div>
    </footer>
  );
}

export function QuotaBanner() {
  return (
    <div className="no-print rounded-xl border border-sky2/40 bg-sky2/10 px-4 py-3 text-[13px] leading-relaxed text-sky-100" role="status">
      <strong className="font-semibold text-sky2">Live search is resting.</strong>{" "}
      Today's live-search budget is used up, so the wallet behind this site stays safe — a drained wallet
      would look like a broken site, and it isn't. Radar caps live runs per day and serves repeats from
      cache for free. Below is a full worked example instead; everything else on this site — exports,
      saved investors, methodology — works as normal. Live searches reset at midnight UTC.{" "}
      <Link href="/methodology" className="font-medium text-sky2 underline underline-offset-2">How the budget works</Link>
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="no-print rounded-xl border border-amber2/40 bg-amber2/10 px-4 py-3 text-[13px] leading-relaxed text-amber-100">
      <strong className="font-semibold text-amber2">Demo mode.</strong>{" "}
      No TinyFish API key is configured on this server, so you are viewing a sample result built from
      representative data. Add <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px]">TINYFISH_API_KEY</code> to
      the environment and Radar runs live — TinySet dataset, Search, Fetch and Agent — for any startup description.{" "}
      <Link href="/methodology" className="font-medium text-amber2 underline underline-offset-2">How it works</Link>
    </div>
  );
}
