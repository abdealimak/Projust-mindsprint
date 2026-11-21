'use client';

import React, { useState } from 'react';
import { ProjectSummary } from '@/lib/ai/schemas';
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  FileCode,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface OverviewTabProps {
  summary: ProjectSummary | null;
  onAskQuestion: (question: string) => void;
}

export function OverviewTab({ summary, onAskQuestion }: OverviewTabProps) {
  const [expandedFlows, setExpandedFlows] = useState<Record<string, boolean>>({ '0': true });

  if (!summary) {
    return (
      <div className="p-8 text-center text-xs text-neutral-400">
        No architectural summary available for this project.
      </div>
    );
  }

  const toggleFlow = (idx: string) => {
    setExpandedFlows((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const complexityColors = {
    beginner: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300/40',
    intermediate: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border-blue-300/40',
    advanced: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400 border-purple-300/40',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: One-Liner & Complexity */}
      <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161a26] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
            {summary.projectType}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${complexityColors[summary.complexity]}`}>
            {summary.complexity} complexity
          </span>
        </div>

        <p className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white leading-relaxed">
          {summary.oneLiner}
        </p>

        {/* Tech Stack Chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
          <span className="text-[11px] text-neutral-400 mr-1">Stack:</span>
          {summary.techStack.map((tech) => (
            <span
              key={tech.name}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              title={tech.role}
            >
              <span>{tech.name}</span>
              <span className="text-neutral-400 text-[9px]">({tech.role})</span>
            </span>
          ))}
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161a26] shadow-2xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          <Layers className="w-4 h-4" />
          <span>System Architecture</span>
        </div>
        <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          {summary.architecture}
        </p>
      </div>

      {/* Key Flows & Notable Files (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Flows */}
        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161a26] shadow-2xs space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Key Application Flows
          </h3>
          <div className="space-y-2">
            {summary.keyFlows.map((flow, idx) => {
              const isExpanded = Boolean(expandedFlows[String(idx)]);
              return (
                <div
                  key={flow.name}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleFlow(String(idx))}
                    className="w-full p-3 flex items-center justify-between text-left text-xs font-semibold text-neutral-900 dark:text-white bg-neutral-50/50 dark:bg-neutral-800/40 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  >
                    <span>{flow.name}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="p-3 text-[11px] text-neutral-600 dark:text-neutral-400 space-y-2 bg-white dark:bg-[#161a26]">
                      <p>{flow.description}</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {flow.files.map((file) => (
                          <span
                            key={file}
                            className="font-mono text-[10px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                          >
                            {file}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Notable Files & Entry Points */}
        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161a26] shadow-2xs space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Critical Entry Points & Files
          </h3>
          <div className="space-y-2">
            {summary.entryPoints.map((entry) => (
              <div
                key={entry.path}
                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-start gap-2.5"
              >
                <FileCode className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-white block truncate">
                    {entry.path}
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {entry.why}
                  </span>
                </div>
              </div>
            ))}

            {summary.notableFiles.map((notable) => (
              <div
                key={notable.path}
                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-start gap-2.5"
              >
                <FileCode className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-white block truncate">
                    {notable.path}
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {notable.purpose}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Starter Questions */}
      <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161a26] shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Ask Your Tutor — Suggested Questions</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {summary.suggestedQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onAskQuestion(q)}
              className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-400 dark:hover:border-blue-500 text-left text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center justify-between gap-2 group cursor-pointer"
            >
              <span className="line-clamp-2">{q}</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-500 shrink-0 transition" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
