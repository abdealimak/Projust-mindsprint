'use client';

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ASPECTS, ASPECT_LABELS, type AspectScores } from '@/types/learning';

interface AspectRadarProps {
  scores: AspectScores;
  height?: number;
  showTicks?: boolean;
}

/** Six-skill radar in the landing style: warm grid, lime fill, ink stroke. */
export function AspectRadar({ scores, height = 220 }: AspectRadarProps) {
  // Short axis labels so they fit small radars; full names stay in the tooltip.
  const short: Partial<Record<(typeof ASPECTS)[number], string>> = { ai_collaboration: 'AI collab', architecture_design: 'Architecture' };
  const data = ASPECTS.map((a) => ({ subject: ASPECT_LABELS[a], axis: short[a] ?? ASPECT_LABELS[a], score: Math.round(scores[a] ?? 0) }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="66%" data={data} margin={{ top: 12, right: 30, bottom: 12, left: 30 }} style={{ overflow: "visible" }}>
          <PolarGrid stroke="#E3DFD7" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: '#5E5B56', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as { subject: string; score: number };
                return (
                  <div className="bg-sheet border border-line px-3 py-2 rounded-s shadow-lift text-[12.5px]">
                    <p className="font-medium text-ink">{item.subject}</p>
                    <p className="text-muted">
                      <span className="font-mono text-ink">{item.score}</span> / 100
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#111110"
            strokeWidth={1.6}
            fill="rgba(205,235,90,.45)"
            fillOpacity={1}
            dot={{ r: 2.5, fill: '#111110', stroke: 'none' }}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
