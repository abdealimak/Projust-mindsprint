import { TICKER } from "@/lib/demo-data";

/**
 * Live feed of recently issued certificates (demo data).
 * The row is duplicated so the CSS loop is seamless; hover pauses it.
 */
export function Ticker() {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden}>
      {TICKER.map((t) => (
        <li key={t.code} className="flex items-center gap-3 whitespace-nowrap border-r border-rule px-7 text-[14px]">
          <span
            className={`h-2 w-2 rounded-full ${t.level === "Interview-verified" ? "bg-seal" : "bg-mark ring-1 ring-ink/40"}`}
          />
          <span className="text-ink">{t.who}</span>
          <span className="text-ink-2">{t.project}</span>
          <span className="font-mono text-[13px] text-ink-3">{t.code}</span>
          <span className="rounded-md border border-rule bg-sheet px-1.5 font-mono text-[12px] tabular-nums text-ink">
            {t.avg}
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="ticker relative border-y border-rule bg-sheet py-4">
      <p className="sr-only">Recently issued certificates</p>
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="ticker-track flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </div>
  );
}
