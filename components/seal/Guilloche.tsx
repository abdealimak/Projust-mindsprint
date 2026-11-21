"use client";

import { motion, useReducedMotion, type MotionValue, useTransform } from "motion/react";
import { useMemo } from "react";

/**
 * Guilloché seal — the line pattern used on banknotes and certificates.
 * Each ring is a circle whose radius waves: r(t) = R + A·sin(k·t).
 * Stacking rings with different k makes the moiré. The rosette in the
 * middle is a hypotrochoid. Paths are built once; motion only rotates
 * the groups (transform), so it stays cheap.
 */

function ringPath(cx: number, R: number, A: number, k: number, steps = 360) {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = R + A * Math.sin(k * t);
    const x = cx + r * Math.cos(t);
    const y = cx + r * Math.sin(t);
    d += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
  }
  return d + "Z";
}

function rosettePath(cx: number, R: number, r: number, d0: number, steps = 900) {
  // hypotrochoid; closes after r/gcd(R,r) turns
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const turns = r / gcd(R, r);
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const x = cx + (R - r) * Math.cos(t) + d0 * Math.cos(((R - r) / r) * t);
    const y = cx + (R - r) * Math.sin(t) - d0 * Math.sin(((R - r) / r) * t);
    d += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
  }
  return d;
}

type Props = {
  size?: number;
  color?: string;
  /** false = lines hidden; true = lines draw in over drawDuration (s) */
  drawn?: boolean;
  drawDuration?: number;
  /** rotation in degrees driven by cursor; rings counter-rotate */
  spin?: MotionValue<number>;
  className?: string;
  label?: string;
};

export function Guilloche({ size = 240, color = "var(--seal)", drawn = true, drawDuration = 0, spin, className, label }: Props) {
  const reduce = useReducedMotion();
  const c = 100; // viewBox is 200x200
  const paths = useMemo(
    () => ({
      outer: [
        ringPath(c, 92, 4, 36),
        ringPath(c, 88, 4, 36),
        ringPath(c, 84, 3.5, 30),
      ],
      mid: [ringPath(c, 70, 6, 18), ringPath(c, 66, 6, 18), ringPath(c, 62, 5, 12)],
      rosette: rosettePath(c, 50, 7, 28),
    }),
    [],
  );

  const zero = useTransform(() => 0);
  const s = spin ?? zero;
  const counter = useTransform(s, (v) => -v * 1.6);
  const slow = useTransform(s, (v) => v * 0.6);

  const common = {
    fill: "none",
    stroke: color,
    vectorEffect: "non-scaling-stroke" as const,
    initial: { pathLength: drawDuration && !reduce ? 0 : 1 },
    animate: { pathLength: drawn ? 1 : 0 },
    transition: { duration: reduce ? 0 : drawDuration, ease: [0.16, 1, 0.3, 1] as const },
  };

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <motion.g style={{ rotate: reduce ? 0 : s, originX: "50%", originY: "50%" }}>
        {paths.outer.map((d, i) => (
          <motion.path key={i} d={d} strokeWidth={0.6} opacity={0.85} {...common} />
        ))}
      </motion.g>
      <motion.g style={{ rotate: reduce ? 0 : counter, originX: "50%", originY: "50%" }}>
        {paths.mid.map((d, i) => (
          <motion.path key={i} d={d} strokeWidth={0.55} opacity={0.75} {...common} />
        ))}
      </motion.g>
      <motion.g style={{ rotate: reduce ? 0 : slow, originX: "50%", originY: "50%" }}>
        <motion.path d={paths.rosette} strokeWidth={0.45} opacity={0.9} {...common} />
      </motion.g>
    </svg>
  );
}
