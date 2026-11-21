"use client";

import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useId, useState } from "react";
import { Guilloche } from "@/components/seal/Guilloche";
import { Button } from "@/components/ui/Button";
import { Radar } from "@/components/ui/Radar";
import { type DemoCert, DEMO_CERTS, findCert } from "@/lib/demo-data";
import { EASE_IN, EASE_OUT } from "@/lib/motion";
import { average } from "@/lib/scoring";

const FORMAT = /^PJ-\d{4}-[A-Z0-9]{6}$/;

type State =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "found"; cert: DemoCert }
  | { kind: "missing"; code: string };

/**
 * Recruiter flow: paste a certificate ID, see the live certificate.
 * idle → checking → found | missing. Format errors show on blur or submit,
 * and clear as soon as the value is valid.
 */
export function VerifyCert() {
  const id = useId();
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });

  const code = value.trim().toUpperCase();
  const formatError = touched && code.length > 0 && !FORMAT.test(code);

  const check = (raw: string) => {
    const c = raw.trim().toUpperCase();
    setTouched(true);
    if (!FORMAT.test(c)) return;
    setState({ kind: "checking" });
    // fake network delay so the checking state is visible
    window.setTimeout(() => {
      const cert = findCert(c);
      setState(cert ? { kind: "found", cert } : { kind: "missing", code: c });
    }, 600);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
      <div>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            check(value);
          }}
        >
          <label htmlFor={id} className="block text-[14px] font-medium text-ink">
            Certificate ID
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id={id}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="PJ-2026-A7X9K2"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={formatError}
              aria-describedby={`${id}-hint`}
              className={`h-11 w-full min-w-0 rounded-full sm:flex-1 border bg-sheet px-5 font-mono text-[15px] uppercase tracking-wide text-ink outline-none transition-colors duration-150 placeholder:normal-case placeholder:text-ink-3/70 focus:border-seal ${
                formatError ? "border-warn" : "border-rule-strong"
              }`}
            />
            <Button type="submit" disabled={state.kind === "checking"}>
              {state.kind === "checking" ? "Checking…" : "Check certificate"}
            </Button>
          </div>
          <p id={`${id}-hint`} className={`mt-2 text-[14px] ${formatError ? "text-warn" : "text-ink-3"}`}>
            {formatError
              ? "That doesn't look like a Projust ID. IDs look like PJ-2026-A7X9K2."
              : "It's printed on the certificate, the resume tag and the QR code."}
          </p>
        </form>

        <div className="mt-6">
          <p className="text-[14px] text-ink-2">Try a sample</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEMO_CERTS.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setValue(c.code);
                  check(c.code);
                }}
                className="h-9 rounded-full border border-rule-strong bg-sheet px-4 font-mono text-[13px] text-ink transition-colors duration-150 hover:border-ink-3"
              >
                {c.code}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setValue("PJ-2026-ZZZ000");
                check("PJ-2026-ZZZ000");
              }}
              className="h-9 rounded-full px-3 text-[14px] text-ink-2 transition-colors duration-150 hover:text-ink"
            >
              Try a fake one
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-[360px]" aria-live="polite">
        <AnimatePresence mode="wait">
          {state.kind === "idle" && (
            <motion.div key="idle" {...fade} className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[16px] border border-dashed border-rule-strong p-8 text-center">
              <Guilloche size={96} color="var(--rule-strong)" />
              <p className="mt-4 max-w-[34ch] text-[15px] text-ink-2">
                Enter an ID to see the live certificate, its version history and a link to the full report.
              </p>
            </motion.div>
          )}
          {state.kind === "checking" && (
            <motion.div key="checking" {...fade} className="flex min-h-[360px] flex-col gap-3 rounded-[16px] border border-rule bg-sheet p-6">
              {[60, 40, 80, 50].map((w, i) => (
                <span key={i} className="h-4 animate-pulse rounded bg-paper-2" style={{ width: `${w}%` }} />
              ))}
            </motion.div>
          )}
          {state.kind === "missing" && (
            <motion.div key="missing" {...fade} className="rounded-[16px] border border-warn/30 bg-warn-soft p-6">
              <p className="font-display text-[26px] leading-tight text-ink">No certificate with this ID</p>
              <p className="mt-2 text-[15px] text-ink-2">
                <span className="font-mono">{state.code}</span> was never issued, or the owner revoked it. Check the ID
                for typos, or ask the candidate for their public certificate link.
              </p>
            </motion.div>
          )}
          {state.kind === "found" && (
            <motion.div key={state.cert.code} {...fade}>
              <CertCard cert={state.cert} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: EASE_IN } },
};

function CertCard({ cert }: { cert: DemoCert }) {
  const [qr, setQr] = useState("");
  const url = `projust.app/cert/${cert.code}`;

  useEffect(() => {
    QRCode.toString(`https://${url}`, {
      type: "svg",
      margin: 0,
      color: { dark: "#14181f", light: "#00000000" },
    }).then(setQr);
  }, [url]);

  const interview = cert.level === "Interview-verified";

  return (
    <article className="rounded-[16px] border border-rule bg-sheet p-1.5 shadow-[var(--shadow-lift)]">
      <div className="relative overflow-hidden rounded-[11px] border border-seal/25 p-6">
        <Guilloche size={220} className="pointer-events-none absolute -right-16 -top-16 opacity-40" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[14px] text-pass">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-pass align-middle" />
              Valid, last updated {cert.versions.at(-1)!.date}
            </p>
            <h3 className="font-display mt-2 text-[32px] leading-[1.1]">{cert.name}</h3>
            <p className="mt-1 text-[15px] text-ink-2">
              {cert.project}, built with {cert.stack.join(", ")}
            </p>
          </div>
          <span
            className={`rounded-md border px-2.5 py-1 text-[13px] font-medium ${
              interview ? "border-seal/40 text-seal" : "border-pass/40 text-pass"
            }`}
          >
            {cert.level}
          </span>
        </div>

        <div className="relative mt-6 grid gap-6 sm:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-4">
            <Radar scores={cert.scores} size={120} />
            <div>
              <p className="font-mono text-[28px] tabular-nums leading-none">{average(cert.scores).toFixed(0)}</p>
              <p className="mt-1 text-[13px] text-ink-2">average of six aspects</p>
            </div>
          </div>
          <div>
            <p className="text-[14px] text-ink-2">Concepts mastered</p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink">{cert.concepts.join(", ")}</p>
            <p className="mt-3 text-[14px] text-ink-2">{cert.ownership}</p>
          </div>
        </div>

        <div className="relative mt-6 grid gap-6 border-t border-rule pt-5 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-[14px] text-ink-2">Version history</p>
            <ol className="mt-2 space-y-1.5">
              {cert.versions.map((v) => (
                <li key={v.v} className="flex gap-3 text-[14px]">
                  <span className="w-6 shrink-0 font-mono text-ink-3">v{v.v}</span>
                  <span className="w-24 shrink-0 text-ink-2">{v.date}</span>
                  <span className="text-ink">{v.note}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex items-end gap-4 sm:flex-col sm:items-end">
            <div className="h-20 w-20" dangerouslySetInnerHTML={{ __html: qr }} aria-label={`QR code for ${url}`} role="img" />
            <div className="sm:text-right">
              <p className="font-mono text-[13px]">{cert.code}</p>
              <a href="#verify" className="text-[14px] text-seal underline-offset-4 hover:underline">
                Open full report
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
