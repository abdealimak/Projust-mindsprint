"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useLenis } from "lenis/react";
import { useEffect, useId, useState } from "react";
import { Guilloche } from "@/components/seal/Guilloche";
import { GitHubMark } from "@/components/ui/Button";
import { Mark } from "@/components/ui/Mark";
import { EASE_OUT } from "@/lib/motion";
import { HeroStage } from "./HeroStage";
import { Ticker } from "./Ticker";

const LINE_1 = ["You", "built", "it."];
const LINE_2 = ["Now", "prove", "you"];

/** Accepts "owner/repo" or a github.com URL. Returns "owner/repo" or null. */
function parseRepo(raw: string) {
  const m = raw
    .trim()
    .replace(/\.git$/, "")
    .match(/^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([\w.-]+)\/([\w.-]+)\/?$/i);
  return m ? `${m[1]}/${m[2]}` : null;
}

export function Hero() {
  const reduce = useReducedMotion();
  const id = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [repo, setRepo] = useState("aarav/campus-pay");
  const lenis = useLenis();

  // the big background seal turns with the cursor anywhere on the page top
  const mx = useMotionValue(0);
  const smooth = useSpring(mx, { stiffness: 60, damping: 24 });
  const spin = useTransform(smooth, [-1, 1], [-18, 18]);
  useEffect(() => {
    if (reduce) return;
    const on = (e: PointerEvent) => mx.set((e.clientX / window.innerWidth) * 2 - 1);
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, [mx, reduce]);

  const word = (w: string, i: number) => (
    <motion.span
      key={w + i}
      className="inline-block"
      initial={reduce ? false : { opacity: 0, y: "0.35em" }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.05 + i * 0.05 }}
    >
      {w}
    </motion.span>
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = parseRepo(value);
    setError(!r);
    if (r) {
      setRepo(r);
      // Lenis owns smooth scroll; fall back to native when it is off (reduced motion)
      if (lenis) lenis.scrollTo("#hero-stage", { offset: -96 });
      else document.getElementById("hero-stage")?.scrollIntoView({ block: "start" });
    }
  };

  return (
    <section id="top" className="relative overflow-hidden pt-28 sm:pt-36">
      {/* backdrop: notebook dot grid + a large seal that turns with the cursor */}
      <div className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-[900px]" aria-hidden />
      <div className="pointer-events-none absolute left-1/2 top-[-260px] -translate-x-1/2 opacity-[0.16]" aria-hidden>
        <Guilloche size={980} spin={spin} drawDuration={2.2} />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="mx-auto max-w-[880px] text-center">

          <h1 className="font-display text-[clamp(3rem,1.4rem+6.4vw,6.6rem)] font-normal leading-[0.98] tracking-[-0.03em] text-ink">
            <span className="flex flex-wrap justify-center gap-x-[0.22em]">{LINE_1.map((w, i) => word(w, i))}</span>
            <span className="flex flex-wrap justify-center gap-x-[0.22em]">
              {LINE_2.map((w, i) => word(w, i + 3))}
              <motion.span
                className="inline-block"
                initial={reduce ? false : { opacity: 0, y: "0.35em" }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.35 }}
              >
                <Mark delay={0.75}>understand it.</Mark>
              </motion.span>
            </span>
          </h1>

          <motion.p
            className="mx-auto mt-7 max-w-[52ch] text-lead text-ink-2"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.45 }}
          >
            Projust reads your repo, teaches you the concepts inside it, quizzes you on your own code, and gives you a
            certificate recruiters can check.
          </motion.p>

          {/* repo form: drives the live demo below */}
          <motion.form
            onSubmit={submit}
            noValidate
            className="mx-auto mt-9 max-w-[560px]"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.55 }}
          >
            <label htmlFor={id} className="sr-only">
              GitHub repository
            </label>
            <div
              className={`flex flex-col gap-2 rounded-[22px] border bg-sheet p-1.5 shadow-[var(--shadow-lift)] transition-colors duration-150 focus-within:border-ink sm:flex-row sm:rounded-full ${
                error ? "border-warn" : "border-rule-strong"
              }`}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 pl-4">
                <GitHubMark className="h-4 w-4 shrink-0 text-ink-3" />
                <input
                  id={id}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    if (error && parseRepo(e.target.value)) setError(false);
                  }}
                  placeholder="github.com/you/your-project"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={error}
                  aria-describedby={`${id}-hint`}
                  className="h-11 min-w-0 flex-1 bg-transparent font-mono text-[15px] text-ink outline-none placeholder:text-ink-3/70"
                />
              </span>
              <button
                type="submit"
                className="h-11 shrink-0 rounded-full bg-ink px-6 text-[15px] font-medium text-sheet transition-colors duration-150 hover:bg-mark hover:text-ink active:scale-[0.98]"
              >
                Analyze my repo
              </button>
            </div>
            <p id={`${id}-hint`} className={`mt-3 text-[14px] ${error ? "text-warn" : "text-ink-3"}`}>
              {error
                ? "Use a repo link like github.com/you/project, or owner/project."
                : "Try any repo name to see the demo. Free for students; private code is never shown."}
            </p>
          </motion.form>
        </div>

        <motion.div
          id="hero-stage"
          className="mx-auto mt-16 max-w-[1120px] sm:mt-20"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.6 }}
        >
          <HeroStage repo={repo} />
        </motion.div>
      </div>

      <div className="mt-20">
        <Ticker />
      </div>
    </section>
  );
}
