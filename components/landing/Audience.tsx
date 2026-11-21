"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { EASE_IN, EASE_OUT } from "@/lib/motion";

const TABS = [
  {
    id: "students",
    label: "Students",
    title: "A tutor built from your own project",
    body: "Learn the parts you skipped, practise for interviews on code you wrote, and walk in with a certificate that backs up your resume.",
    Art: StudentArt,
  },
  {
    id: "recruiters",
    label: "Recruiters",
    title: "A one-page report you can trust",
    body: "Strengths, weak spots and suggested questions for each candidate, tied to their real repo. Read it in five minutes before the round.",
    Art: RecruiterArt,
  },
  {
    id: "teachers",
    label: "Teachers",
    title: "Grade understanding, not just the demo",
    body: "See whether a submitted project reflects what the student actually knows, and where the whole class has gaps.",
    Art: TeacherArt,
  },
  {
    id: "companies",
    label: "Companies",
    title: "Hire people who know your domain",
    body: "Post a listing, and Projust builds a course from the domain knowledge you need. Applicants take it, and you get verified reports. Coming next.",
    Art: CompanyArt,
  },
];

/** Accessible tabs: arrow keys move between tabs, Home/End jump. */
export function Audience() {
  const [i, setI] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const go = (n: number) => {
    const next = (n + TABS.length) % TABS.length;
    setI(next);
    refs.current[next]?.focus();
  };
  const t = TABS[i];
  return (
    <div>
      <div
        role="tablist"
        aria-label="Who Projust is for"
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-rule bg-sheet p-1"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(i + 1);
          if (e.key === "ArrowLeft") go(i - 1);
          if (e.key === "Home") go(0);
          if (e.key === "End") go(TABS.length - 1);
        }}
      >
        {TABS.map((tab, n) => (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[n] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={i === n}
            aria-controls={`panel-${tab.id}`}
            tabIndex={i === n ? 0 : -1}
            onClick={() => setI(n)}
            className="relative h-10 shrink-0 rounded-full px-4 text-[15px] font-medium"
          >
            {i === n && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-full bg-mark ring-1 ring-ink/15"
                transition={{ duration: 0.2, ease: EASE_OUT }}
              />
            )}
            <span className={`relative transition-colors duration-150 ${i === n ? "text-ink" : "text-ink-2 hover:text-ink"}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-10 min-h-[340px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={t.id}
            role="tabpanel"
            id={`panel-${t.id}`}
            aria-labelledby={`tab-${t.id}`}
            className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_IN } }}
          >
            <div>
              <h3 className="font-display text-[34px] leading-[1.15]">{t.title}</h3>
              <p className="mt-4 max-w-[46ch] text-lead text-ink-2">{t.body}</p>
            </div>
            <t.Art />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const card = "rounded-[16px] border border-rule bg-sheet p-6 shadow-[var(--shadow-soft)]";

function StudentArt() {
  const rows = [
    ["Concepts learned", "14 of 18"],
    ["Quizzes passed", "11"],
    ["Current streak", "6 days"],
  ];
  return (
    <div className={card}>
      <p className="text-[14px] text-ink-2">Your progress on campus-pay</p>
      <dl className="mt-4 divide-y divide-rule">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between py-3 text-[15px]">
            <dt className="text-ink-2">{k}</dt>
            <dd className="font-mono tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[14px] text-seal">Next: Row-level security, lesson 2</p>
    </div>
  );
}

function RecruiterArt() {
  return (
    <div className={card}>
      <div className="flex items-baseline justify-between">
        <p className="font-display text-[24px]">Aarav Mehta</p>
        <p className="font-mono text-[13px] text-ink-3">PJ-2026-A7X9K2</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-[14px]">
        <div>
          <p className="text-ink-2">Strong at</p>
          <p className="mt-1 text-ink">Code reading, AI review, middleware</p>
        </div>
        <div>
          <p className="text-ink-2">Ask about</p>
          <p className="mt-1 text-ink">Token storage, webhook retries</p>
        </div>
      </div>
      <div className="mt-4 border-t border-rule pt-4">
        <p className="text-[14px] text-ink-2">Suggested question</p>
        <p className="mt-1 text-[15px] text-ink">
          &ldquo;Your Stripe handler has no idempotency key. What would you change, and why?&rdquo;
        </p>
      </div>
    </div>
  );
}

function TeacherArt() {
  const gaps = [
    ["Security", 46],
    ["Debugging", 58],
    ["Architecture", 64],
    ["Concepts", 72],
  ] as const;
  return (
    <div className={card}>
      <p className="text-[14px] text-ink-2">CSE final year, section B, 42 projects</p>
      <ul className="mt-4 space-y-3">
        {gaps.map(([k, v]) => (
          <li key={k} className="grid grid-cols-[110px_1fr_36px] items-center gap-3 text-[14px]">
            <span className="text-ink">{k}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-paper-2">
              <span
                className="block h-full origin-left rounded-full"
                style={{ transform: `scaleX(${v / 100})`, background: v < 50 ? "var(--warn)" : "var(--seal)" }}
              />
            </span>
            <span className="text-right font-mono tabular-nums text-ink-2">{v}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[14px] text-ink-2">7 projects flagged: very low understanding of their own auth code.</p>
    </div>
  );
}

function CompanyArt() {
  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <p className="text-[14px] text-ink-2">Listing</p>
        <span className="rounded-md border border-rule px-2 py-0.5 text-[12px] text-ink-2">Planned</span>
      </div>
      <p className="font-display mt-2 text-[24px]">Backend intern, e-commerce</p>
      <p className="mt-2 text-[15px] text-ink-2">Course built from: inventory locking, payment retries, order state machines.</p>
      <div className="mt-4 flex gap-6 border-t border-rule pt-4 text-[14px]">
        <p>
          <span className="font-mono text-ink">128</span> <span className="text-ink-2">applied</span>
        </p>
        <p>
          <span className="font-mono text-ink">31</span> <span className="text-ink-2">verified</span>
        </p>
      </div>
    </div>
  );
}
