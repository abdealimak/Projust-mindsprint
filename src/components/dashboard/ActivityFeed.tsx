'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ActivityItem } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import {
  CheckCircleIcon,
  TrophyIcon,
  RepoIcon,
  BookIcon,
  MilestoneIcon,
} from '@primer/octicons-react';

export function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  const [activeTab, setActiveTab] = useState<'all' | 'quiz' | 'certificate' | 'project'>('all');

  const filtered = activities.filter((act) => {
    if (activeTab === 'all') return true;
    return act.type === activeTab;
  });

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'quiz':
        return <CheckCircleIcon className="w-4 h-4 text-success" />;
      case 'certificate':
        return <TrophyIcon className="w-4 h-4 text-accent" />;
      case 'project':
        return <RepoIcon className="w-4 h-4 text-accent" />;
      case 'course':
        return <BookIcon className="w-4 h-4 text-[#f59e0b]" />;
      default:
        return <MilestoneIcon className="w-4 h-4 text-fg-muted" />;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-canvas-subtle p-5 shadow-xs space-y-4">
      {/* Header + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">Verification Activity</h2>
          <p className="text-[12px] text-fg-muted">
            Quizzes submitted, score updates, and certificate versions.
          </p>
        </div>

        {/* Clean Pill Tabs */}
        <div className="flex items-center gap-1 bg-canvas p-1 rounded-lg border border-border text-[12px]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-canvas-subtle text-fg font-semibold shadow-xs border border-border'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'quiz'
                ? 'bg-canvas-subtle text-fg font-semibold shadow-xs border border-border'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Quizzes
          </button>
          <button
            onClick={() => setActiveTab('certificate')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'certificate'
                ? 'bg-canvas-subtle text-fg font-semibold shadow-xs border border-border'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Certificates
          </button>
          <button
            onClick={() => setActiveTab('project')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'project'
                ? 'bg-canvas-subtle text-fg font-semibold shadow-xs border border-border'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Projects
          </button>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3.5 p-3.5 rounded-lg border border-border/80 bg-canvas/60 hover:bg-canvas transition-colors"
          >
            <div className="mt-0.5 p-1.5 rounded-lg bg-canvas-subtle border border-border shrink-0">
              {getIcon(item.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] text-fg leading-snug">
                  <span className="font-semibold">{item.title}: </span>
                  {item.description}
                </p>
                <span className="text-[11px] text-fg-muted whitespace-nowrap font-mono shrink-0">
                  {formatRelativeTime(item.timestamp)}
                </span>
              </div>

              {/* Quiz mini chips */}
              {item.chips && item.chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {item.chips.map((chip, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border bg-canvas text-[11px] text-fg font-mono"
                    >
                      <span className="text-fg-muted">{chip.label}:</span>
                      <span className="font-semibold text-accent">{chip.score}/100</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Certificate link badge */}
              {item.cert_id && (
                <div className="mt-2.5">
                  <Link
                    href={`/cert/${item.cert_id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent/40 bg-accent/10 text-accent text-[12px] font-mono hover:underline font-medium"
                  >
                    <TrophyIcon className="w-3.5 h-3.5" />
                    <span>View Certificate {item.cert_id} &rarr;</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
