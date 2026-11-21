'use client';

import React, { useState } from 'react';
import { ProjectSummary } from '@/lib/ai/schemas';
import { ChevronDown, FileCode, MessageSquare, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OverviewTabProps {
  summary: ProjectSummary | null;
  onAskQuestion: (question: string) => void;
  /** Opens a file in the Files tab. */
  onOpenPath?: (path: string) => void;
  /** Paths that are in the index (others render as plain text). */
  indexedPaths?: Set<string>;
  /** Shows the "start learning" call to action. */
  onStartLearning?: () => void;
  startLabel?: string;
}

const COMPLEXITY: Record<ProjectSummary['complexity'], { label: string; cls: string }> = {
  beginner: { label: 'Beginner complexity', cls: 'bg-[#E6F5D0] text-[#3F6212] border-[#CFE6AE]' },
  intermediate: { label: 'Intermediate complexity', cls: 'bg-[#FDF3DC] text-[#8A5A0B] border-[#F1DEAF]' },
  advanced: { label: 'Advanced complexity', cls: 'bg-[#FFE6D9] text-[#963A12] border-[#FFCBB0]' },
};

export function OverviewTab({ summary, onAskQuestion, onOpenPath, indexedPaths, onStartLearning, startLabel }: OverviewTabProps) {
  const [expandedFlows, setExpandedFlows] = useState<Record<string, boolean>>({ '0': true });

  if (!summary) {
    return (
      <div className="pj-card px-6 py-14 text-center">
        <h3 className="pj-display text-[clamp(28px,3vw,36px)]">No summary yet.</h3>
        <p className="mt-3 text-[15px] text-muted max-w-[52ch] mx-auto">
          The architecture summary was not written for this project. The files are indexed, so you can still browse
          them, ask the tutor, and map the concepts.
        </p>
      </div>
    );
  }

  const toggleFlow = (idx: string) => {
    setExpandedFlows((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const PathLink = ({ path, className }: { path: string; className?: string }) => {
    const can = !!onOpenPath && (!indexedPaths || indexedPaths.has(path));
    if (!can) return <span className={cn('font-mono text-[12.5px] text-ink-2 break-all', className)}>{path}</span>;
    return (
      <button
        type="button"
        onClick={() => onOpenPath!(path)}
        className={cn(
          'inline-flex items-center gap-1.5 font-mono text-[12.5px] text-ink hover:underline underline-offset-2 text-left break-all cursor-pointer',
          className
        )}
        title={`Open ${path}`}
      >
        <FileCode className="w-3.5 h-3.5 shrink-0 text-muted" aria-hidden="true" />
        {path}
      </button>
    );
  };

  const cx = COMPLEXITY[summary.complexity] || COMPLEXITY.intermediate;

  return (
    <div className="space-y-4">
      {/* What it is */}
      <section className="pj-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-muted">{summary.projectType}</span>
          <span className={cn('inline-flex items-center h-6 px-2.5 rounded-full border text-[12px] font-medium', cx.cls)}>{cx.label}</span>
        </div>
        <p className="mt-3 font-serif text-[clamp(26px,2.8vw,34px)] leading-[1.15] tracking-[-0.01em] text-ink max-w-[36ch] text-balance">
          {summary.oneLiner}
        </p>

        {summary.techStack.length > 0 && (
          <div className="mt-6 pt-5 border-t border-line">
            <h3 className="text-[13px] font-medium text-muted mb-2.5">Built with</h3>
            <ul className="flex flex-wrap gap-2">
              {summary.techStack.map((tech) => (
                <li key={tech.name} className="inline-flex items-baseline gap-2 px-3 py-1.5 rounded-full border border-line bg-paper-2 text-[13.5px]">
                  <span className="font-medium text-ink">{tech.name}</span>
                  <span className="text-muted text-[12.5px]">{tech.role}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {onStartLearning && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[16px] bg-lime-soft border border-[#DCEBA4] px-4 py-3.5">
            <p className="text-[14.5px] text-ink flex-1 min-w-[220px]">
              Ready to prove you understand it? Map the concepts, read the course, then take the quiz.
            </p>
            <button type="button" onClick={onStartLearning} className="pj-btn !min-h-[38px] text-[13.5px]">
              {startLabel || 'Start learning'}
            </button>
          </div>
        )}
      </section>

      {/* How it fits together */}
      <section className="pj-card p-6 sm:p-8">
        <h3 className="font-serif text-[26px] leading-tight">How it fits together</h3>
        <p className="mt-3 text-[16px] leading-[1.7] text-ink-2 max-w-[72ch]">{summary.architecture}</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Key flows */}
        <section className="pj-card p-6">
          <h3 className="text-[15px] font-semibold">Key flows</h3>
          <p className="text-[13.5px] text-muted mt-0.5">What happens, step by step, and which files do it.</p>
          <div className="mt-4 space-y-2">
            {summary.keyFlows.map((flow, idx) => {
              const isExpanded = Boolean(expandedFlows[String(idx)]);
              return (
                <div key={flow.name} className="rounded-[14px] border border-line overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleFlow(String(idx))}
                    aria-expanded={isExpanded}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left text-[14.5px] font-medium text-ink hover:bg-paper-2 transition-colors duration-150 cursor-pointer"
                  >
                    <span>{flow.name}</span>
                    <ChevronDown
                      className={cn('w-4 h-4 text-muted shrink-0 transition-transform duration-200', isExpanded && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <p className="text-[14px] leading-[1.6] text-ink-2">{flow.description}</p>
                      {flow.files.length > 0 && (
                        <ul className="flex flex-col gap-1.5">
                          {flow.files.map((file) => (
                            <li key={file}>
                              <PathLink path={file} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Files to read first */}
        <section className="pj-card p-6">
          <h3 className="text-[15px] font-semibold">Files to read first</h3>
          <p className="text-[13.5px] text-muted mt-0.5">Entry points, then the files that matter most.</p>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {summary.entryPoints.map((entry) => (
              <li key={`e-${entry.path}`} className="py-3 flex items-start gap-3">
                <span className="mt-0.5 shrink-0 inline-flex items-center h-5 px-2 rounded-full bg-lime border border-[#B9D84A] text-[11.5px] font-medium text-ink">
                  Entry
                </span>
                <div className="min-w-0">
                  <PathLink path={entry.path} />
                  <p className="text-[13.5px] text-muted mt-0.5">{entry.why}</p>
                </div>
              </li>
            ))}
            {summary.notableFiles
              .filter((n) => !summary.entryPoints.some((e) => e.path === n.path))
              .map((notable) => (
                <li key={`n-${notable.path}`} className="py-3 min-w-0">
                  <PathLink path={notable.path} />
                  <p className="text-[13.5px] text-muted mt-0.5">{notable.purpose}</p>
                </li>
              ))}
          </ul>
        </section>
      </div>

      {/* Starter questions */}
      {summary.suggestedQuestions.length > 0 && (
        <section className="pj-card p-6">
          <h3 className="text-[15px] font-semibold inline-flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted" aria-hidden="true" />
            Questions to ask the tutor
          </h3>
          <p className="text-[13.5px] text-muted mt-0.5">Pick one to open the tutor with it filled in.</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {summary.suggestedQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onAskQuestion(q)}
                className="group px-4 py-3 rounded-[14px] border border-line bg-sheet text-left text-[14.5px] text-ink-2 hover:border-line-2 hover:bg-paper-2 hover:text-ink transition-colors duration-150 flex items-center justify-between gap-3 cursor-pointer"
              >
                <span className="line-clamp-2">{q}</span>
                <ArrowRight className="w-4 h-4 text-muted group-hover:text-ink shrink-0 transition-colors" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
