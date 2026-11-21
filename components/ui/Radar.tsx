"use client";

import { motion, useReducedMotion } from "motion/react";
import { ASPECTS, type AspectScores } from "@/lib/scoring";

/** Geometry helpers shared with the interactive radar. */
export function axisPoint(i: number, value: number, cx: number, r: number) {
  const angle = -Math.PI / 2 + (i * Math.PI * 2) / ASPECTS.length;
  const d = (value / 100) * r;
  return { x: cx + d * Math.cos(angle), y: cx + d * Math.sin(angle), angle };
}

export function polygon(scores: AspectScores, cx: number, r: number) {
  return ASPECTS.map((a, i) => {
    const p = axisPoint(i, scores[a.key], cx, r);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");
}

type Props = {
  scores: AspectScores;
  size?: number;
  color?: string;
  /** draw the shape in (used in the hero) */
  show?: boolean;
  className?: string;
};

/** Small, static six-aspect radar. */
export function Radar({ scores, size = 120, color = "var(--seal)", show = true, className }: Props) {
  const reduce = useReducedMotion();
  const cx = 50;
  const r = 42;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon
          key={k}
          points={ASPECTS.map((_, i) => {
            const p = axisPoint(i, k * 100, cx, r);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="var(--rule)"
          strokeWidth={0.6}
        />
      ))}
      {ASPECTS.map((_, i) => {
        const p = axisPoint(i, 100, cx, r);
        return <line key={i} x1={cx} y1={cx} x2={p.x} y2={p.y} stroke="var(--rule)" strokeWidth={0.6} />;
      })}
      <motion.polygon
        points={polygon(scores, cx, r)}
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
        style={{ originX: "50%", originY: "50%" }}
        initial={reduce ? false : { scale: 0, opacity: 0 }}
        animate={show ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}
