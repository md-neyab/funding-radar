import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="font-mono text-sm text-mint">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">This page is off the radar</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
        The page you asked for does not exist. If you were looking for a result, results live at{" "}
        <span className="font-mono text-[13px] text-slate-300">/results</span> after you run a search —
        or start fresh below and describe your startup.
      </p>
      <Link href="/" className="mt-6 inline-block rounded-xl bg-mint px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-emerald-300">
        Describe your startup
      </Link>
    </div>
  );
}
