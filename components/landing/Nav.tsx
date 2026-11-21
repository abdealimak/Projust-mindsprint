"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ButtonLink, GitHubMark } from "@/components/ui/Button";
import { EASE_IN, EASE_OUT } from "@/lib/motion";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#aspects", label: "Scoring" },
  { href: "#verify", label: "Check a certificate" },
  { href: "#who", label: "For teams" },
  { href: "#pricing", label: "Pricing" },
];

export function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2 rounded-md" aria-label="Projust home">
      {/* mark: a seal ring with a tick, drawn as two strokes */}
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--seal)" strokeWidth="1.5" strokeDasharray="2 1.6" />
        <path d="M7.5 12.5l3 3 6-7" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-[22px] leading-none tracking-[-0.01em]">Projust</span>
    </a>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200 ${
        scrolled || open ? "border-rule bg-paper" : "border-transparent bg-paper/0"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-md px-3 py-2 text-[14px] text-ink-2 transition-colors duration-150 hover:text-ink">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <ButtonLink href="#start" size="sm">
              <GitHubMark />
              Sign in with GitHub
            </ButtonLink>
          </span>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
              <path
                d={open ? "M5 5l10 10M15 5L5 15" : "M3 7h14M3 13h14"}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="border-t border-rule bg-paper px-4 pb-6 pt-2 lg:hidden"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15, ease: EASE_IN } }}
          >
            <ul className="flex flex-col">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-rule py-3 text-[16px] text-ink"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <ButtonLink href="#start" className="mt-4 w-full" onClick={() => setOpen(false)}>
              <GitHubMark />
              Sign in with GitHub
            </ButtonLink>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
