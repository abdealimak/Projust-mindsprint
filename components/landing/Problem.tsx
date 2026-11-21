"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

const QUESTION = "Why did you store the token here instead of in a cookie?";

/**
 * The story in one pinned scene, scrubbed by scroll:
 * the professor's question types out → the student's reply never comes →
 * the reframe appears. Reduced motion shows the end state, no pin.
 */
export function Problem() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const chars = el.querySelectorAll("[data-char]");
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top top", end: "+=180%", scrub: 0.6, pin: "[data-pin]" },
        defaults: { ease: "none" },
      });
      tl.from("[data-bubble]", { opacity: 0, y: 12, duration: 0.6 })
        .from(chars, { opacity: 0, duration: 2, stagger: 2 / chars.length }, "<0.2")
        .to("[data-typing]", { opacity: 1, duration: 0.3 })
        .to("[data-typing]", { opacity: 0, duration: 0.3 }, "+=1.4")
        .from("[data-silence]", { opacity: 0, duration: 0.4 }, "<")
        .to("[data-chat]", { opacity: 0.35, duration: 0.8 }, "+=0.6")
        .from("[data-line='1']", { opacity: 0, y: 16, duration: 0.8 }, "<")
        .from("[data-line='2']", { opacity: 0, y: 16, duration: 0.8 }, "+=0.3")
        .from("[data-line='3']", { opacity: 0, y: 16, duration: 0.8 }, "+=0.3");
      return () => tl.scrollTrigger?.kill();
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} aria-labelledby="problem-title" className="relative">
      <div data-pin className="flex items-center py-24 lg:min-h-[100svh]">
        <div className="mx-auto grid w-full max-w-[1200px] gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
          {/* the viva */}
          <div data-chat className="self-center">
            <p className="text-[14px] text-ink-3">Final-year project viva, 11:40 am</p>
            <div data-bubble className="mt-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rule bg-sheet font-display text-[17px]">
                R
              </span>
              <div>
                <p className="text-[14px] text-ink-2">Prof. Rao</p>
                <p className="mt-1 max-w-[30ch] rounded-[14px] rounded-tl-[4px] border border-rule bg-sheet px-4 py-3 font-display text-[24px] leading-[1.3] text-ink shadow-[var(--shadow-soft)] sm:text-[28px]">
                  {QUESTION.split("").map((c, i) => (
                    <span key={i} data-char>
                      {c}
                    </span>
                  ))}
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <div className="text-right">
                <p className="text-[14px] text-ink-2">Student</p>
                <p className="relative mt-1 h-12 min-w-[160px] rounded-[14px] rounded-tr-[4px] border border-dashed border-rule-strong px-4 py-3 text-[15px] text-ink-3">
                  <span data-typing className="absolute inset-0 flex opacity-0 items-center justify-end gap-1 px-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
                  </span>
                  <span data-silence className="absolute inset-0 flex items-center justify-end px-4 italic">
                    no answer
                  </span>
                </p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rule bg-paper-2 text-[14px] text-ink-2">
                S
              </span>
            </div>
          </div>

          {/* the reframe */}
          <div className="self-center">
            <h2 id="problem-title" data-line="1" className="font-display text-h2 font-normal">
              The demo was perfect. The answer never came.
            </h2>
            <p data-line="2" className="mt-6 max-w-[48ch] text-lead text-ink-2">
              AI makes a polished project and a keyword-perfect resume nearly free. Resume checkers measure how a project
              is presented, not whether the person understands it. So teachers can&apos;t grade real skill, interviewers
              waste rounds, and honest students look the same as everyone else.
            </p>
            <p data-line="3" className="mt-6 max-w-[44ch] border-l-2 border-seal pl-4 text-[17px] text-ink">
              Using AI well is a skill. What we lost is a way to check understanding. Projust puts it back.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
