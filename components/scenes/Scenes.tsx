"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { EASE_OUT } from "@/lib/motion";
import { ASPECTS } from "@/lib/scoring";

/* Four small product scenes for "How it works". Each plays when `active`. */

const panel = "h-full rounded-[16px] border border-rule bg-sheet shadow-[var(--shadow-soft)]";

/* 1 — Understand: concept map tied to files */
const NODES = [
  { id: "auth", label: "Auth middleware", file: "src/auth/session.ts:4", x: 10, y: 12 },
  { id: "jwt", label: "JWT storage", file: "src/auth/session.ts:10", x: 54, y: 26 },
  { id: "db", label: "Row-level security", file: "supabase/policies.sql:1", x: 44, y: 52 },
  { id: "hook", label: "Stripe webhooks", file: "app/api/stripe/route.ts:12", x: 30, y: 66 },
  { id: "rl", label: "Rate limiting", file: "src/auth/session.ts:15", x: 6, y: 40 },
];
const EDGES: [string, string][] = [
  ["auth", "jwt"],
  ["auth", "rl"],
  ["jwt", "db"],
  ["hook", "db"],
  ["auth", "hook"],
];

export function ConceptMapScene({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const [sel, setSel] = useState("jwt");
  const pos = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const on = active || reduce;
  return (
    <div className={`${panel} relative overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-rule px-5 py-3 text-[14px]">
        <span className="text-ink">Concept map</span>
        <span className="text-ink-3">campus-pay, 14 concepts</span>
      </div>
      <div className="relative h-[calc(100%-49px)] min-h-[300px]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {EDGES.map(([a, b], i) => (
            <motion.line
              key={i}
              x1={pos[a].x + 8}
              y1={pos[a].y + 3}
              x2={pos[b].x + 8}
              y2={pos[b].y + 3}
              stroke={sel === a || sel === b ? "var(--seal)" : "var(--rule-strong)"}
              strokeWidth={0.3}
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: on ? 1 : 0 }}
              transition={{ duration: 0.3, delay: on && !reduce ? 0.25 + i * 0.08 : 0, ease: EASE_OUT }}
            />
          ))}
        </svg>
        {NODES.map((n, i) => (
          <motion.button
            type="button"
            key={n.id}
            onClick={() => setSel(n.id)}
            aria-pressed={sel === n.id}
            className={`absolute whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-150 ${
              sel === n.id ? "border-seal bg-seal text-sheet" : "border-rule-strong bg-sheet text-ink hover:border-ink-3"
            }`}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, delay: on && !reduce ? i * 0.06 : 0, ease: EASE_OUT }}
          >
            {n.label}
          </motion.button>
        ))}
        <div className="absolute inset-x-4 bottom-4 rounded-[10px] border border-rule bg-paper px-4 py-3">
          <p className="font-mono text-[13px] text-seal">{pos[sel].file}</p>
          <p className="mt-0.5 text-[14px] text-ink-2">Click any concept to jump to the lines that use it.</p>
        </div>
      </div>
    </div>
  );
}

/* 2 — Learn: tutor answers from the user's own code */
const ANSWER =
  "In saveSession() on line 12 you put the JWT in localStorage. Any script on the page can read it, so one XSS bug leaks every session. An httpOnly cookie can't be read by JavaScript. Want to see how your middleware would read it instead?";

export function TutorScene({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    if (reduce || !active) return;
    let i = 0;
    const t = window.setInterval(() => {
      i += 3;
      setTyped(Math.min(i, ANSWER.length));
      if (i >= ANSWER.length) window.clearInterval(t);
    }, 24);
    return () => {
      window.clearInterval(t);
      setTyped(0);
    };
  }, [active, reduce]);
  const n = reduce ? ANSWER.length : typed;
  return (
    <div className={`${panel} flex flex-col`}>
      <div className="flex items-center justify-between border-b border-rule px-5 py-3 text-[14px]">
        <span className="text-ink">Tutor</span>
        <span className="text-ink-3">Answers from your repo</span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="ml-auto max-w-[80%] rounded-[14px] rounded-tr-[4px] bg-ink px-4 py-2.5 text-[15px] text-sheet">
          Why is storing the token in localStorage bad?
        </p>
        <div className="max-w-[92%] rounded-[14px] rounded-tl-[4px] border border-rule bg-paper px-4 py-3 text-[15px] leading-relaxed text-ink">
          {ANSWER.slice(0, n)}
          {n < ANSWER.length && <span className="caret text-seal" />}
          {n >= ANSWER.length && (
            <span className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-md border border-rule bg-sheet px-2 py-0.5 font-mono text-[12px] text-seal">
                src/auth/session.ts:12
              </span>
              <span className="rounded-md border border-rule bg-sheet px-2 py-0.5 font-mono text-[12px] text-seal">
                src/auth/session.ts:4
              </span>
            </span>
          )}
        </div>
        <p className="mt-auto text-[13px] text-ink-3">The tutor explains. It won&apos;t hand you quiz answers.</p>
      </div>
    </div>
  );
}

/* 3 — Prove: quiz on your own code moves the six aspects */
const OPTIONS = [
  "Nothing, the token is still valid",
  "The user is charged twice",
  "The webhook is ignored the second time",
];
const BEFORE = [62, 58, 44, 55, 41, 60];
const AFTER = [66, 61, 57, 58, 52, 63];

export function QuizScene({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const [choice, setPicked] = useState<number | null>(null);
  useEffect(() => {
    if (reduce || !active) return;
    const t = window.setTimeout(() => setPicked((p) => p ?? 1), 900);
    return () => {
      window.clearTimeout(t);
      setPicked(null);
    };
  }, [active, reduce]);
  const picked = reduce && choice === null ? 1 : choice;
  const scores = picked === 1 ? AFTER : BEFORE;
  return (
    <div className={`${panel} flex flex-col`}>
      <div className="flex items-center justify-between border-b border-rule px-5 py-3 text-[14px]">
        <span className="text-ink">Quiz, Payments module</span>
        <span className="text-ink-3">Question 3 of 5</span>
      </div>
      <div className="p-5">
        <p className="text-[16px] text-ink">
          Stripe sends <span className="font-mono text-[14px]">checkout.session.completed</span> twice. Your handler in{" "}
          <span className="font-mono text-[14px]">app/api/stripe/route.ts</span> has no idempotency check. What happens?
        </p>
        <div className="mt-4 space-y-2">
          {OPTIONS.map((o, i) => {
            const right = picked !== null && i === 1;
            return (
              <button
                key={o}
                type="button"
                onClick={() => setPicked(i)}
                className={`flex w-full items-center justify-between rounded-[10px] border px-4 py-2.5 text-left text-[15px] transition-colors duration-150 ${
                  right
                    ? "border-pass bg-pass-soft text-ink"
                    : picked === i
                      ? "border-warn bg-warn-soft text-ink"
                      : "border-rule hover:border-rule-strong"
                }`}
              >
                {o}
                {right && <span className="text-[13px] text-pass">Correct</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-auto grid grid-cols-3 gap-x-4 gap-y-3 border-t border-rule p-5">
        {ASPECTS.map((a, i) => (
          <div key={a.key}>
            <div className="flex justify-between text-[12px] text-ink-2">
              <span>{a.short}</span>
              <span className="font-mono tabular-nums">{scores[i]}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-paper-2">
              <div
                className="h-full origin-left rounded-full bg-seal transition-transform duration-300 ease-out"
                style={{ transform: `scaleX(${scores[i] / 100})` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 4 — Carry: the proof goes where people look */
export function CarryScene({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const on = active || reduce;
  const item = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 10 },
    animate: on ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    transition: { duration: 0.3, delay: on && !reduce ? i * 0.12 : 0, ease: EASE_OUT },
  });
  return (
    <div className={`${panel} flex flex-col gap-4 p-5`}>
      <motion.div {...item(0)} className="rounded-[12px] border border-rule p-4">
        <p className="text-[13px] text-ink-3">Resume</p>
        <p className="mt-1 text-[16px] font-medium text-ink">campus-pay — UPI and card payments for college fests</p>
        <p className="text-[14px] text-ink-2">Next.js, Supabase, Stripe. 1,200 transactions in the first fest.</p>
        <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-seal/30 bg-seal-soft px-2 py-1 text-[13px] text-seal">
          Verified by Projust, PJ-2026-A7X9K2
        </p>
      </motion.div>
      <motion.div {...item(1)} className="rounded-[12px] border border-rule p-4">
        <p className="text-[13px] text-ink-3">GitHub README</p>
        <div className="mt-2 inline-flex overflow-hidden rounded-[4px] text-[12px] leading-[20px]">
          <span className="bg-[#3c4350] px-2 text-sheet">projust</span>
          <span className="bg-pass px-2 text-sheet">understood 73</span>
        </div>
      </motion.div>
      <motion.div {...item(2)} className="flex items-center justify-between gap-3 rounded-[12px] border border-rule p-4">
        <div>
          <p className="text-[13px] text-ink-3">LinkedIn</p>
          <p className="text-[15px] text-ink">Adds the certificate with ID and link filled in</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#0a66c2] px-4 py-2 text-[14px] font-medium text-sheet">Add to profile</span>
      </motion.div>
    </div>
  );
}
