'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, ArrowRight } from 'lucide-react';

/**
 * Learning streak, kept in this browser: a day counts when a lesson or quiz is opened.
 * `markLearningDay(projectId)` is called from the Course and Quiz tabs.
 */
const KEY = 'pj-learning-days';
const LAST = 'pj-learning-last';

const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local day

export function markLearningDay(projectId: string, tab: 'course' | 'quiz') {
  try {
    const days: string[] = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    const d = today();
    if (!days.includes(d)) window.localStorage.setItem(KEY, JSON.stringify([...days, d].slice(-60)));
    window.localStorage.setItem(LAST, JSON.stringify({ projectId, tab }));
  } catch {
    // storage blocked: no streak, nothing else breaks
  }
}

function streakOf(days: string[]) {
  const set = new Set(days);
  const d = new Date();
  // Today not done yet still keeps yesterday's streak alive
  if (!set.has(d.toLocaleDateString('en-CA'))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(d.toLocaleDateString('en-CA'))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return { n, doneToday: set.has(today()) };
}

export function StreakNudge() {
  const [state, setState] = useState<{ n: number; doneToday: boolean; last: { projectId: string; tab: string } | null } | null>(null);
  useEffect(() => {
    try {
      const days: string[] = JSON.parse(window.localStorage.getItem(KEY) || '[]');
      const last = JSON.parse(window.localStorage.getItem(LAST) || 'null');
      setState({ ...streakOf(days), last });
    } catch {
      setState(null);
    }
  }, []);
  if (!state || (!state.n && !state.last)) return null;

  const text = state.doneToday
    ? `${state.n}-day streak. Nice, today counts.`
    : state.n
      ? `${state.n}-day streak. One lesson today keeps it going.`
      : 'Pick up where you left off.';

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 text-[13.5px] text-ink-2 px-3.5 py-2.5 rounded-2xl bg-sheet border border-line w-fit max-w-full">
      <Flame className={state.n ? 'w-4 h-4 text-tangerine' : 'w-4 h-4 text-muted'} aria-hidden />
      <span>{text}</span>
      {state.last && !state.doneToday && (
        <Link
          href={`/projects/${state.last.projectId}?tab=${state.last.tab}`}
          className="inline-flex items-center gap-1 font-medium text-ink underline underline-offset-4 decoration-line hover:decoration-ink"
        >
          {state.last.tab === 'quiz' ? 'Continue the quiz' : 'Continue the course'}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
