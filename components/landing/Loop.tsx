"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CarryScene, ConceptMapScene, QuizScene, TutorScene } from "@/components/scenes/Scenes";
import { EASE_IN, EASE_OUT } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    title: "Understand your project",
    body: "Connect GitHub and pick a repo. Projust finds every concept you used, from middleware to webhooks, and links each one to the exact files and lines.",
    Scene: ConceptMapScene,
  },
  {
    title: "Learn from your own code",
    body: "Ask the tutor anything about your project. Lessons use your code as the examples, so you learn the theory behind what you already shipped.",
    Scene: TutorScene,
  },
  {
    title: "Prove it, one quiz at a time",
    body: "After every lesson, a short quiz on your repo: predict this output, find this bug, what breaks if this fires twice. Each answer moves six scores.",
    Scene: QuizScene,
  },
  {
    title: "Carry the proof",
    body: "Hit the bar and a certificate unlocks with a unique ID, QR code and report. It keeps updating as you learn. Put it on your resume, README and LinkedIn.",
    Scene: CarryScene,
  },
];

/**
 * Sticky scrollytelling: text steps scroll on the left, the product scene
 * on the right stays pinned (CSS sticky) and swaps when a step reaches the
 * middle of the screen. On mobile each step shows its scene inline.
 */
export function Loop() {
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const steps = Array.from(el.querySelectorAll<HTMLElement>("[data-step]"));
    // active step = the last one whose top has passed 55% of the viewport.
    // Computed from positions, so fast jumps (anchor links) can't skip a step.
    const pick = () => {
      const line = window.innerHeight * 0.55;
      let idx = 0;
      steps.forEach((s, i) => {
        if (s.getBoundingClientRect().top < line) idx = i;
      });
      setActive(idx);
    };
    const watcher = ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      onUpdate: pick,
      onRefresh: pick,
    });
    const fill = gsap.fromTo(
      rail.current,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: { trigger: el.querySelector("[data-steps]"), start: "top 55%", end: "bottom 55%", scrub: true },
      },
    );
    return () => {
      watcher.kill();
      fill.scrollTrigger?.kill();
      fill.kill();
    };
  }, []);

  const Scene = STEPS[active].Scene;

  return (
    <section id="how" aria-labelledby="how-title" className="py-24 sm:py-32">
      <div ref={root} className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="max-w-[640px]">
          <h2 id="how-title" className="font-display text-h2 font-normal">
            One loop, from repo to proof
          </h2>
          <p className="mt-5 text-lead text-ink-2">
            Understand your project, learn from it, prove it, and carry the proof into your resume.
          </p>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div data-steps className="relative pl-8">
            {/* progress rail */}
            <span className="absolute bottom-0 left-[7px] top-0 w-px bg-rule" aria-hidden />
            <span
              ref={rail}
              className="absolute bottom-0 left-[7px] top-0 w-px origin-top bg-ink"
              style={{ transform: "scaleY(0)" }}
              aria-hidden
            />
            <ol>
              {STEPS.map((s, i) => (
                <li key={s.title} data-step className="relative pb-16 last:pb-0 lg:min-h-[62vh]">
                  <span
                    className={`absolute -left-8 top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full border transition-colors duration-200 ${
                      i < active ? "border-ink bg-ink" : i === active ? "border-ink bg-mark" : "border-rule-strong bg-paper"
                    }`}
                    aria-hidden
                  />
                  <p className="font-mono text-[13px] text-ink-3">Step {i + 1} of 4</p>
                  <h3
                    className={`font-display mt-2 text-[30px] leading-[1.15] transition-colors duration-200 sm:text-[34px] ${
                      i === active ? "text-ink" : "text-ink-3"
                    }`}
                  >
                    {s.title}
                  </h3>
                  <p className="mt-3 max-w-[44ch] text-[16px] text-ink-2">{s.body}</p>
                  {/* inline scene on small screens */}
                  <div className="mt-6 h-[440px] lg:hidden">
                    <s.Scene active={i === active} />
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-[16vh] h-[66vh] max-h-[580px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  className="h-full"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.15, ease: EASE_IN } }}
                >
                  <Scene active />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
