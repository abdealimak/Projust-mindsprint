// The six locked certificate aspects and the unlock rule (spec §6).
// Kept here so the app can reuse the exact same rule later.

export const ASPECTS = [
  { key: "concept", label: "Concept understanding", short: "Concepts" },
  { key: "code", label: "Code comprehension", short: "Code" },
  { key: "debug", label: "Debugging", short: "Debugging" },
  { key: "arch", label: "Architecture & design", short: "Architecture" },
  { key: "security", label: "Security & best practices", short: "Security" },
  { key: "ai", label: "AI collaboration", short: "AI collab" },
] as const;

export type AspectKey = (typeof ASPECTS)[number]["key"];
export type AspectScores = Record<AspectKey, number>;

export const UNLOCK_AVG = 60;
export const UNLOCK_MIN = 40;

export function average(s: AspectScores) {
  const v = Object.values(s);
  return v.reduce((a, b) => a + b, 0) / v.length;
}

export function lowest(s: AspectScores) {
  return Math.min(...Object.values(s));
}

/** Certificate unlocks when average ≥ 60 and no aspect is below 40. */
export function isUnlocked(s: AspectScores) {
  return average(s) >= UNLOCK_AVG && lowest(s) >= UNLOCK_MIN;
}
