"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Highlighter swipe behind a phrase — the site's one "pop" moment per heading.
 * Draws once: on load (hero) or when scrolled into view.
 */
export function Mark({
  children,
  delay = 0,
  onView = false,
}: {
  children: React.ReactNode;
  delay?: number;
  onView?: boolean;
}) {
  const reduce = useReducedMotion();
  const to = { "--mark-p": 1 } as Record<string, number>;
  const from = { "--mark-p": reduce ? 1 : 0 } as Record<string, number>;
  const transition = { duration: reduce ? 0 : 0.55, delay: reduce ? 0 : delay, ease: [0.65, 0, 0.35, 1] as const };
  return (
    <motion.span
      className="mark"
      initial={from}
      {...(onView
        ? { whileInView: to, viewport: { once: true, amount: 0.8 } }
        : { animate: to })}
      transition={transition}
    >
      {children}
    </motion.span>
  );
}
