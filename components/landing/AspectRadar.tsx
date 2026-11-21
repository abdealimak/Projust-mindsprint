"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { Guilloche } from "@/components/seal/Guilloche";
import { axisPoint, polygon } from "@/components/ui/Radar";
import { EASE_IN, EASE_OUT } from "@/lib/motion";
import {
  ASPECTS,
  type AspectKey,
  type AspectScores,
  UNLOCK_AVG,
  UNLOCK_MIN,
  average,
  isUnlocked,
  lowest,
} from "@/lib/scoring";

const PRESETS: { label: string; scores: AspectScores }[] = [
  { label: "Strong all-round", scores: { concept: 82, code: 88, debug: 74, arch: 70, security: 66, ai: 84 } },
  { label: "Just enough", scores: { concept: 60, code: 60, debug: 60, arch: 60, security: 60, ai: 60 } },
  { label: "Great, but weak on security", scores: { concept: 90, code: 92, debug: 80, arch: 78, security: 36, ai: 88 } },
];

const SIZE = 420;
const CX = SIZE / 2;
const R = 160;

/**
 * Interactive radar that teaches the unlock rule.
 * Drag a handle (or focus it and use arrow keys) to change one aspect.
 * Each handle is a real slider for screen readers.
 */
export function AspectRadar() {
  const [scores, setScores] = useState<AspectScores>({
    concept: 72,
    code: 64,
    debug: 48,
    arch: 58,
    security: 44,
    ai: 66,
  });
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<number | null>(null);

  const avg = average(scores);
  const low = lowest(scores);
  const unlocked = isUnlocked(scores);
  const lowKey = ASPECTS.find((a) => scores[a.key] === low)!;

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const set = (key: AspectKey, v: number) => setScores((s) => ({ ...s, [key]: clamp(v) }));
  const nudge = (key: AspectKey, d: number) => setScores((s) => ({ ...s, [key]: clamp(s[key] + d) }));

  // project the pointer onto the axis to get a 0–100 value
  const fromPointer = (i: number, e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const scale = SIZE / rect.width;
    const x = (e.clientX - rect.left) * scale - CX;
    const y = (e.clientY - rect.top) * scale - CX;
    const { angle } = axisPoint(i, 100, CX, R);
    const along = x * Math.cos(angle) + y * Math.sin(angle);
    set(ASPECTS[i].key, (along / R) * 100);
  };

  const onKey = (i: number, e: React.KeyboardEvent) => {
    const k = ASPECTS[i].key;
    const step = e.shiftKey ? 10 : 2;
    const map: Record<string, number> = {
      ArrowUp: step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowLeft: -step,
      PageUp: 10,
      PageDown: -10,
    };
    if (e.key in map) {
      e.preventDefault();
      nudge(k, map[e.key]);
    } else if (e.key === "Home") set(k, 0);
    else if (e.key === "End") set(k, 100);
  };

  const color = unlocked ? "var(--pass)" : "var(--seal)";

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      {/* radar */}
      <div className="relative mx-auto w-full max-w-[520px]">
        <svg
          ref={svgRef}
          viewBox={`-56 -8 ${SIZE + 112} ${SIZE + 16}`}
          className="w-full touch-none select-none overflow-visible"
          onPointerMove={(e) => dragging.current !== null && fromPointer(dragging.current, e)}
          onPointerUp={() => (dragging.current = null)}
          onPointerLeave={() => (dragging.current = null)}
        >
          {/* rings: 40 (floor) and 60 (average target) are drawn stronger */}
          {[20, 40, 60, 80, 100].map((v) => (
            <polygon
              key={v}
              points={ASPECTS.map((_, i) => {
                const p = axisPoint(i, v, CX, R);
                return `${p.x},${p.y}`;
              }).join(" ")}
              fill="none"
              stroke={v === UNLOCK_MIN ? "var(--warn)" : "var(--rule)"}
              strokeOpacity={v === UNLOCK_MIN ? 0.45 : 1}
              strokeDasharray={v === UNLOCK_MIN ? "4 4" : undefined}
              strokeWidth={1}
            />
          ))}
          {ASPECTS.map((a, i) => {
            const end = axisPoint(i, 100, CX, R);
            const lab = axisPoint(i, 122, CX, R);
            return (
              <g key={a.key}>
                <line x1={CX} y1={CX} x2={end.x} y2={end.y} stroke="var(--rule)" />
                <text
                  x={lab.x}
                  y={lab.y}
                  textAnchor={Math.abs(lab.x - CX) < 8 ? "middle" : lab.x > CX ? "start" : "end"}
                  dominantBaseline="middle"
                  className="fill-ink-2 text-[14px]"
                >
                  {a.short}
                </text>
              </g>
            );
          })}

          <polygon
            points={polygon(scores, CX, R)}
            fill={color}
            fillOpacity={0.1}
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            style={{ transition: "stroke 300ms, fill 300ms" }}
          />

          {ASPECTS.map((a, i) => {
            const p = axisPoint(i, scores[a.key], CX, R);
            const bad = scores[a.key] < UNLOCK_MIN;
            return (
              <g
                key={a.key}
                role="slider"
                tabIndex={0}
                aria-label={a.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={scores[a.key]}
                aria-valuetext={`${scores[a.key]} out of 100${bad ? ", below the floor of 40" : ""}`}
                className="cursor-grab outline-none active:cursor-grabbing [&:focus-visible>circle:first-child]:stroke-seal"
                onPointerDown={(e) => {
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  dragging.current = i;
                }}
                onPointerMove={(e) => dragging.current === i && fromPointer(i, e)}
                onPointerUp={() => (dragging.current = null)}
                onKeyDown={(e) => onKey(i, e)}
              >
                {/* big invisible hit area (44px) */}
                <circle cx={p.x} cy={p.y} r={22} fill="transparent" stroke="transparent" strokeWidth={2} />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={8}
                  fill="var(--sheet)"
                  stroke={bad ? "var(--warn)" : color}
                  strokeWidth={2.5}
                />
              </g>
            );
          })}
        </svg>
        <p className="mt-2 text-center text-[14px] text-ink-3">
          Drag a point, or focus it and use the arrow keys. The dashed ring is the floor of {UNLOCK_MIN}.
        </p>
      </div>

      {/* readout */}
      <div>
        <div className="rounded-[14px] border border-rule bg-sheet p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-5">
            <div className="relative h-[88px] w-[88px] shrink-0">
              <Guilloche size={88} color={color} />
              <AnimatePresence mode="wait">
                <motion.span
                  key={unlocked ? "open" : "shut"}
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 1.3 }}
                  animate={{ opacity: 1, scale: 1, transition: { duration: 0.3, ease: EASE_OUT } }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15, ease: EASE_IN } }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sheet">
                    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                      {unlocked ? (
                        <path d="M5 10.5l3.2 3.2L15 6.5" stroke="var(--pass)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      ) : (
                        <>
                          <rect x="5" y="9" width="10" height="7" rx="1.5" fill="none" stroke="var(--ink-2)" strokeWidth="1.6" />
                          <path d="M7.5 9V7a2.5 2.5 0 015 0v2" fill="none" stroke="var(--ink-2)" strokeWidth="1.6" />
                        </>
                      )}
                    </svg>
                  </span>
                </motion.span>
              </AnimatePresence>
            </div>
            <div aria-live="polite">
              <p className="font-display text-[28px] leading-[1.15]">
                {unlocked ? "Certificate unlocked" : "Not unlocked yet"}
              </p>
              <p className="mt-1 text-[14px] text-ink-2">
                {unlocked
                  ? "Keep learning and the same certificate updates to a new version."
                  : avg < UNLOCK_AVG
                    ? `Average is ${avg.toFixed(0)}. It needs ${UNLOCK_AVG}.`
                    : `${lowKey.label} is ${low}. No aspect can be under ${UNLOCK_MIN}.`}
              </p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-rule bg-rule">
            <div className="bg-sheet p-4">
              <dt className="text-[14px] text-ink-2">Average</dt>
              <dd className={`mt-1 font-mono text-[24px] tabular-nums ${avg >= UNLOCK_AVG ? "text-pass" : "text-ink"}`}>
                {avg.toFixed(0)}
                <span className="block text-[14px] text-ink-3 sm:inline"> / needs {UNLOCK_AVG}</span>
              </dd>
            </div>
            <div className="bg-sheet p-4">
              <dt className="text-[14px] text-ink-2">Lowest aspect</dt>
              <dd className={`mt-1 font-mono text-[24px] tabular-nums ${low >= UNLOCK_MIN ? "text-pass" : "text-warn"}`}>
                {low}
                <span className="block text-[14px] text-ink-3 sm:inline"> / floor {UNLOCK_MIN}</span>
              </dd>
            </div>
          </dl>

          <ul className="mt-5 space-y-2.5">
            {ASPECTS.map((a) => (
              <li key={a.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-[14px]">
                <span className="text-ink">{a.label}</span>
                <span className="font-mono tabular-nums text-ink-2">{scores[a.key]}</span>
                <span className="col-span-2 h-1 overflow-hidden rounded-full bg-paper-2">
                  <span
                    className="block h-full origin-left rounded-full transition-transform duration-200 ease-out"
                    style={{
                      transform: `scaleX(${scores[a.key] / 100})`,
                      background: scores[a.key] < UNLOCK_MIN ? "var(--warn)" : color,
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Try a sample score">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setScores(p.scores)}
              className="h-9 rounded-full border border-rule-strong bg-sheet px-4 text-[14px] text-ink transition-colors duration-150 hover:border-ink-3"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
