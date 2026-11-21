"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { EASE_IN, EASE_OUT } from "@/lib/motion";

const LAYERS = [
  {
    title: "Repo ownership check",
    status: "Built",
    body: "We read the commit history through GitHub: who owns the repo, who wrote most commits, and whether it is a fork or one giant initial commit.",
  },
  {
    title: "Questions only your repo can answer",
    status: "Built",
    body: "Every quiz is generated from your files and shuffled, so answers can't be shared between students.",
  },
  {
    title: "Light proctoring",
    status: "Built",
    body: "Tab switches during a quiz are flagged in the report. Optional screen share comes later.",
  },
  {
    title: "AI voice viva",
    status: "Planned",
    body: "A short spoken interview about your own project, with adaptive follow-ups. A human reviewer checks the transcript and signs off.",
  },
  {
    title: "Injected-bug challenge",
    status: "Planned",
    body: "We break something in a sandbox copy of your project. You find and fix it against the clock.",
  },
  {
    title: "Confidence, not a verdict",
    status: "Built",
    body: "Six separate scores, retakes allowed, and context in the report, so one nervous attempt doesn't brand anyone.",
  },
];

export function Trust() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="divide-y divide-rule overflow-hidden rounded-[16px] border border-rule bg-sheet">
      {LAYERS.map((l, i) => {
        const isOpen = open === i;
        return (
          <li key={l.title}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`layer-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-paper sm:px-6"
              >
                <span className="flex-1 text-[17px] text-ink">{l.title}</span>
                <span className={`text-[13px] ${l.status === "Built" ? "text-pass" : "text-ink-3"}`}>{l.status}</span>
                <svg
                  viewBox="0 0 16 16"
                  className={`h-4 w-4 text-ink-3 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                  aria-hidden
                >
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`layer-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } }}
                  exit={{ opacity: 0, transition: { duration: 0.1, ease: EASE_IN } }}
                >
                  <p className="max-w-[62ch] px-5 pb-5 text-[15px] text-ink-2 sm:px-6">{l.body}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
