import React from 'react';
import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import type { LearningSummary } from '@/types/learning';
import { cn } from '@/lib/utils';
import { JOURNEY, nextStep } from './journey';

/**
 * "Where you are" card: the five-stage rail (Import, Concepts, Course, Quiz, Certificate)
 * with the current stage highlighted, and one button for the next action.
 * With no projects it shows the same rail at stage one, so a first-time visitor sees the whole flow.
 */
export function NextStepCard({ summary, sample }: { summary: LearningSummary | null; sample?: boolean }) {
  const step = summary
    ? nextStep(summary)
    : {
        index: 0,
        title: 'Import your first repository',
        note: 'Paste a GitHub link or pick one of your repos. Projust checks how much of it you wrote.',
        cta: 'Import a repository',
        href: '/projects/new',
        busy: false,
      };
  const repo = summary?.repo_full_name;
  const done = step.index >= JOURNEY.length;

  return (
    <section aria-labelledby="next-step-title" className="pj-card overflow-hidden">
      <div className="px-5 sm:px-6 pt-5 sm:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-[13px] text-muted">{repo ? 'Where you are' : 'How it works'}</span>
          {repo && (
            <span className="inline-flex items-center gap-2 min-w-0 max-w-full">
              <span className="font-mono text-[12.5px] text-ink-2 truncate">{repo}</span>
              {sample && (
                <span className="shrink-0 text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-[#FDF3DC] text-[#8A5A0B] border border-[#F1DEAF]">
                  Sample
                </span>
              )}
            </span>
          )}
        </div>

        {/* Stage rail */}
        <ol className="mt-5 grid grid-cols-5 gap-1.5 sm:gap-2" aria-label="Progress">
          {JOURNEY.map((stage, i) => {
            const state = i < step.index || done ? 'done' : i === step.index ? 'current' : 'todo';
            return (
              <li
                key={stage.id}
                className="min-w-0"
                aria-current={state === 'current' ? 'step' : undefined}
                aria-label={`${stage.label}: ${state === 'done' ? 'done' : state === 'current' ? 'current step' : 'not started'}`}
              >
                <div
                  className={cn(
                    'h-1.5 rounded-full',
                    state === 'done' ? 'bg-ink' : state === 'current' ? 'bg-lime' : 'bg-line'
                  )}
                />
                <div className="mt-2 hidden sm:flex items-center gap-1.5 min-w-0">
                  <span
                    className={cn(
                      'hidden sm:grid w-[18px] h-[18px] rounded-full place-items-center shrink-0 text-[10px] font-semibold',
                      state === 'done'
                        ? 'bg-ink text-paper'
                        : state === 'current'
                          ? 'bg-lime text-ink'
                          : 'bg-paper border border-line text-muted'
                    )}
                    aria-hidden
                  >
                    {state === 'done' ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      'text-[11.5px] sm:text-[13px] truncate',
                      state === 'todo' ? 'text-muted' : 'text-ink font-medium'
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="sm:hidden mt-2 text-[12.5px] text-ink-2">
          {done ? 'All five steps done' : `Step ${step.index + 1} of ${JOURNEY.length}: ${JOURNEY[step.index].label}`}
        </p>
      </div>

      <div className="mt-5 px-5 sm:px-6 py-5 border-t border-line bg-paper/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12.5px] text-muted">{done ? 'All five steps done' : step.busy ? 'In progress' : 'Next step'}</p>
          <h2 id="next-step-title" className="mt-0.5 text-[18px] font-semibold tracking-[-0.01em] flex items-center gap-2">
            {step.busy && <Loader2 className="w-4 h-4 animate-spin text-muted" aria-hidden />}
            {step.title}
          </h2>
          <p className="mt-1 text-[14px] text-muted leading-snug max-w-[54ch]">{step.note}</p>
        </div>
        <Link
          href={step.href}
          className={cn('pj-btn shrink-0 w-full sm:w-auto', step.busy && 'pj-btn-ghost')}
        >
          {step.cta}
        </Link>
      </div>
    </section>
  );
}
