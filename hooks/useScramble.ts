"use client";

import { useEffect, useState } from "react";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";

/**
 * Serial-number effect: characters settle left to right into `target`.
 * Fixed characters (like "PJ-" and dashes) never scramble.
 */
export function useScramble(target: string, active: boolean, ms = 900, keep = 3) {
  const masked = target.slice(0, keep) + target.slice(keep).replace(/[A-Z0-9]/g, "·");
  const [text, setText] = useState(masked);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = requestAnimationFrame(() => setText(target));
      return () => cancelAnimationFrame(t);
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const settled = Math.floor(p * target.length);
      let out = "";
      for (let i = 0; i < target.length; i++) {
        const ch = target[i];
        if (i < keep || i < settled || ch === "-") out += ch;
        else out += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      setText(out);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setText(masked);
    };
  }, [target, active, ms, keep, masked]);

  return active ? text : masked;
}
