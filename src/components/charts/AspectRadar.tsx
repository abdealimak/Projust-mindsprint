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
import { AspectScores } from '@/types';

interface AspectRadarProps {
  scores: AspectScores;
  height?: number;
  showTicks?: boolean;
}

export function AspectRadar({ scores, height = 220 }: AspectRadarProps) {
  const data = [
    { subject: 'Concepts', fullSubject: 'Concept Understanding', score: scores.concept_understanding },
    { subject: 'Comprehension', fullSubject: 'Code Comprehension', score: scores.code_comprehension },
    { subject: 'Debugging', fullSubject: 'Debugging & Remediation', score: scores.debugging },
    { subject: 'Architecture', fullSubject: 'Architecture & Design', score: scores.architecture_design },
    { subject: 'Security', fullSubject: 'Security & Best Practices', score: scores.security_best_practices },
    { subject: 'AI Collab', fullSubject: 'AI Collaboration & Prompting', score: scores.ai_collaboration },
  ];

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="var(--border)" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-canvas-subtle border border-border px-2.5 py-1.5 rounded-[6px] shadow-lg text-[12px]">
                    <p className="font-semibold text-fg">{item.fullSubject}</p>
                    <p className="text-accent font-mono font-medium">Score: {item.score}/100</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Radar
            name="Skill Score"
            dataKey="score"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.25}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
