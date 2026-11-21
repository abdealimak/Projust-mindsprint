"use client";

import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useInView,
  useTransform,
} from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Guilloche } from "@/components/seal/Guilloche";
import { Radar } from "@/components/ui/Radar";
import { useScramble } from "@/hooks/useScramble";
import { HERO_CONCEPTS, HERO_FILE, HERO_NOTES, SAMPLE_SCORES } from "@/lib/demo-data";
import { EASE_OUT } from "@/lib/motion";

/**
 * Hero stage: one orchestrated load moment in three acts.
 *   read    → the file types in line by line
 *   extract → each concept is highlighted in the code, a chip lifts out,
 *             and a margin note shows the question Projust will ask
 *   seal    → chips move into the certificate, the seal draws, ID settles
 * State machine: read → extract → seal. Click skips, "Replay" restarts.
 * `repo` changes (from the hero form) also restart it.
 */

type Act = "read" | "extract" | "seal";
const LINE_MS = 50;
const LINE_H = 22;
const BODY_TOP = 41 + 8; // header height + body padding
const CERT_ID = "PJ-2026-A7X9K2";

export function HeroStage({ repo = "aarav/campus-pay" }: { repo?: string }) {
  const reduce = useReducedMotion();
  const [act, setAct] = useState<Act>("read");
  const [linesShown, setLinesShown] = useState(0);
  const [found, setFound] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const timers = useRef<number[]>([]);
  const box = useRef<HTMLDivElement>(null);
  // start the show only once the stage is actually on screen
  const seen = useInView(box, { once: true, amount: 0.2 });
  const project = repo.split("/").pop() || repo;

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const finish = useCallback(() => {
    clear();
    setLinesShown(HERO_FILE.lines.length);
    setFound(HERO_CONCEPTS.length);
    setAct("seal");
  }, []);

  useEffect(() => {
    clear();
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    if (reduce) {
      at(0, finish);
      return clear;
    }
    if (!seen) return clear;
    at(0, () => {
      setAct("read");
      setLinesShown(0);
      setFound(0);
    });
    const n = HERO_FILE.lines.length;
    for (let i = 1; i <= n; i++) at(500 + i * LINE_MS, () => setLinesShown(i));
    const t1 = 500 + n * LINE_MS + 250;
    at(t1, () => setAct("extract"));
    HERO_CONCEPTS.forEach((_, i) => at(t1 + 150 + i * 650, () => setFound(i + 1)));
    at(t1 + 150 + HERO_CONCEPTS.length * 650 + 500, () => setAct("seal"));
    return clear;
  }, [run, repo, reduce, finish, seen]);

  // cursor tilt + seal spin (heavily damped, no overshoot)
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 30 });
  const sy = useSpring(py, { stiffness: 120, damping: 30 });
  const rotateY = useTransform(sx, [-1, 1], [-3, 3]);
  const rotateX = useTransform(sy, [-1, 1], [2.5, -2.5]);
  const spin = useTransform(sx, [-1, 1], [-30, 30]);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width) * 2 - 1);
    py.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };

  const sealed = act === "seal";
  const current = hover ?? (act === "extract" ? HERO_CONCEPTS[found - 1]?.id : null);
  const lit = (line: number) => HERO_CONCEPTS.find((c) => c.id === current && line >= c.from && line <= c.to);
  const serial = useScramble(CERT_ID, sealed, 900);
  const steps: Act[] = ["read", "extract", "seal"];
  const idx = steps.indexOf(act);
  const label =
    act === "read" ? `Reading ${repo}` : act === "extract" ? `Found ${found} of 14 concepts` : "Certificate issued";

  return (
    <div ref={box}>
      <div
        className="relative flex h-[540px] gap-6 [perspective:1600px] sm:h-[560px]"
        onPointerMove={onMove}
        onPointerLeave={() => {
          px.set(0);
          py.set(0);
        }}
        onClick={() => act !== "seal" && finish()}
      >
        {/* ---------- margin notes (desktop) ---------- */}
        <div className="relative hidden w-[250px] shrink-0 lg:block">
          <p
            className="absolute left-0 top-0 text-[13px] text-ink-3 transition-opacity duration-300"
            style={{ opacity: found > 0 ? 1 : 0 }}
          >
            Questions it will ask you
          </p>
          <AnimatePresence>
            {HERO_NOTES.map((n, i) =>
              i < found ? (
                <motion.div
                  key={n.concept + run}
                  className="absolute left-0 right-0"
                  style={{ top: BODY_TOP + (n.line - 1) * LINE_H - 14 }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: sealed ? 0.5 : 1, x: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                  onPointerEnter={() => setHover(n.concept)}
                  onPointerLeave={() => setHover(null)}
                >
                  <div
                    className={`relative rounded-[12px] border bg-sheet px-3.5 py-2.5 shadow-[var(--shadow-soft)] transition-colors duration-200 ${
                      current === n.concept ? "border-ink" : "border-rule"
                    }`}
                  >
                    <p className="text-[12px] text-ink-3">
                      <span className="mr-1.5 inline-block rounded-[3px] bg-mark px-1 text-ink">{n.aspect}</span>
                      line {n.line}
                    </p>
                    <p className="font-display mt-1 text-[16px] leading-[1.3] text-ink">{n.q}</p>
                    {/* connector to the code line */}
                    <span className="absolute -right-6 top-[22px] h-px w-6 bg-ink/40" aria-hidden />
                    <span
                      className="absolute -right-[27px] top-[19px] h-[7px] w-[7px] rounded-full border border-ink bg-mark"
                      aria-hidden
                    />
                  </div>
                </motion.div>
              ) : null,
            )}
          </AnimatePresence>
        </div>

        <LayoutGroup>
          <motion.div className="relative flex-1" style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
            {/* ---------- code panel ---------- */}
            <motion.div
              className="absolute left-0 top-0 w-[96%] overflow-hidden rounded-[14px] border border-rule bg-sheet shadow-[var(--shadow-soft)] sm:w-[72%]"
              animate={sealed ? { scale: 0.95, x: -8, y: -4, opacity: 0.55 } : { scale: 1, x: 0, y: 0, opacity: 1 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              style={{ originX: 0, originY: 0 }}
            >
              <div className="flex h-[41px] items-center justify-between border-b border-rule px-4">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex shrink-0 gap-1" aria-hidden>
                    <span className="h-2.5 w-2.5 rounded-full border border-rule-strong" />
                    <span className="h-2.5 w-2.5 rounded-full border border-rule-strong" />
                    <span className="h-2.5 w-2.5 rounded-full border border-rule-strong" />
                  </span>
                  <span className="ml-2 truncate font-mono text-[12px] text-ink-2">{HERO_FILE.path}</span>
                </span>
                <span className="hidden truncate pl-3 font-mono text-[12px] text-ink-3 sm:block">{repo}</span>
              </div>
              <div className="relative py-2 font-mono text-[12px] leading-[22px] sm:text-[13px]">
                {HERO_FILE.lines.map((line, i) => {
                  const n = i + 1;
                  const c = lit(n);
                  return (
                    <div
                      key={i}
                      className="relative flex pr-4 transition-[opacity,background-color] duration-150"
                      style={{
                        opacity: n <= linesShown ? 1 : 0,
                        background: c ? "var(--mark-soft)" : "transparent",
                      }}
                    >
                      {/* highlighter edge on lit lines */}
                      <span
                        className="absolute inset-y-0 left-0 w-[3px] origin-top bg-mark transition-transform duration-200"
                        style={{ transform: `scaleY(${c ? 1 : 0})` }}
                        aria-hidden
                      />
                      <span className="w-10 shrink-0 select-none pr-3 text-right text-ink-3/70">{n}</span>
                      <span className="whitespace-pre text-ink">{line || " "}</span>
                      {n === linesShown && act === "read" && <span className="caret text-seal" />}
                    </div>
                  );
                })}

                {!sealed &&
                  HERO_CONCEPTS.slice(0, found).map((c) => (
                    <motion.button
                      type="button"
                      key={c.id}
                      layoutId={`chip-${c.id}`}
                      className={`absolute right-3 z-10 flex items-center gap-2 rounded-full border px-3 py-1 font-sans text-[12px] shadow-[var(--shadow-soft)] transition-colors duration-150 ${
                        current === c.id ? "border-ink bg-ink text-sheet" : "border-rule-strong bg-sheet text-ink"
                      }`}
                      style={{ top: 8 + (c.from - 1) * LINE_H }}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT }}
                      onPointerEnter={() => setHover(c.id)}
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => setHover(c.id)}
                      onBlur={() => setHover(null)}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-mark ring-1 ring-ink/40" />
                      {c.name}
                      <span className={`font-mono ${current === c.id ? "text-sheet/70" : "text-ink-3"}`}>
                        L{c.from}–{c.to}
                      </span>
                    </motion.button>
                  ))}
              </div>
            </motion.div>

            {/* ---------- certificate ---------- */}
            <AnimatePresence>
              {sealed && (
                <motion.div
                  key={"cert" + run}
                  className="absolute bottom-0 right-0 w-[96%] rounded-[18px] border border-rule bg-sheet p-1.5 shadow-[var(--shadow-lift)] sm:w-[64%]"
                  initial={{ opacity: 0, y: 28, rotate: 1.5 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                >
                  <div className="relative overflow-hidden rounded-[13px] border border-seal/25 p-5 sm:p-6">
                    <Guilloche
                      size={300}
                      spin={spin}
                      className="pointer-events-none absolute -bottom-36 -left-28 opacity-[0.18]"
                    />
                    <div className="relative flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[12px] text-ink-3">Projust certificate of understanding</p>
                        <p className="font-display mt-1 text-[30px] leading-[1.1]">Aarav Mehta</p>
                        <p className="mt-1 truncate text-[14px] text-ink-2">{project}, built with Next.js and Supabase</p>
                      </div>
                      <div className="relative -mr-2 -mt-2 shrink-0">
                        <Guilloche size={104} drawDuration={1.4} spin={spin} label="Projust seal" />
                        <motion.span
                          className="absolute inset-0 m-auto flex h-fit w-fit -rotate-6 items-center whitespace-nowrap rounded-md border border-ink bg-mark px-2 py-0.5 text-[12px] font-medium text-ink"
                          initial={reduce ? false : { opacity: 0, scale: 1.4 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: reduce ? 0 : 1.1, duration: 0.2, ease: EASE_OUT }}
                        >
                          Course-verified
                        </motion.span>
                      </div>
                    </div>

                    <div className="relative mt-4 flex flex-wrap gap-1.5">
                      {HERO_CONCEPTS.map((c) => (
                        <motion.span
                          key={c.id}
                          layoutId={`chip-${c.id}`}
                          className="flex items-center gap-2 rounded-full border border-rule bg-paper px-3 py-1 text-[12px] text-ink"
                          transition={{ duration: 0.3, ease: EASE_OUT }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-seal" />
                          {c.name}
                          <span className="text-ink-3">{c.strength}</span>
                        </motion.span>
                      ))}
                    </div>

                    <div className="relative mt-5 flex items-end justify-between gap-4 border-t border-rule pt-4">
                      <div className="flex items-center gap-3">
                        <Radar scores={SAMPLE_SCORES} size={64} />
                        <div className="text-[12px] leading-[1.45] text-ink-2">
                          <p>Six aspects, average 73</p>
                          <p>82% of commits by Aarav</p>
                        </div>
                      </div>
                      <p
                        className="whitespace-nowrap font-mono text-[13px] tabular-nums tracking-wide text-ink"
                        aria-label={`Certificate ID ${CERT_ID}`}
                      >
                        {serial}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      </div>

      {/* progress + replay */}
      <div className="mt-5 flex items-center justify-between gap-4 text-[14px] text-ink-2 lg:pl-[274px]">
        <div className="flex min-w-0 items-center gap-3" aria-live="polite">
          <span className="flex shrink-0 gap-1" aria-hidden>
            {steps.map((a, i) => (
              <span
                key={a}
                className="h-1.5 w-7 rounded-full transition-colors duration-200"
                style={{
                  background: i < idx || sealed ? "var(--ink)" : i === idx ? "var(--mark)" : "var(--rule)",
                  boxShadow: i === idx && !sealed ? "inset 0 0 0 1px rgba(20,24,31,.35)" : undefined,
                }}
              />
            ))}
          </span>
          <span className="truncate">{label}</span>
        </div>
        <button
          type="button"
          onClick={() => (sealed ? setRun((r) => r + 1) : finish())}
          className="shrink-0 rounded-md px-2 py-1 text-ink-2 transition-colors duration-150 hover:text-ink"
        >
          {sealed ? "Replay" : "Skip"}
        </button>
      </div>
    </div>
  );
}
