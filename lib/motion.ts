// Motion tokens shared by CSS (globals.css), Motion and GSAP.
// Chrome (buttons, tabs, nav) uses only these durations.
// Scroll-scrubbed scenes follow the scroll, so they have no fixed duration.

export const DUR = {
  fast: 0.1,
  quick: 0.15,
  base: 0.2,
  slow: 0.3,
} as const;

// ease-out on enter, ease-in on exit. No bounce / overshoot.
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN = [0.7, 0, 0.84, 0] as const;

export const enter = { duration: DUR.slow, ease: EASE_OUT };
export const exit = { duration: DUR.quick, ease: EASE_IN };
