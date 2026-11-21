'use client';

import React from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import { Plus, MoreHorizontal, CheckCircle2, Clock, GitBranch } from 'lucide-react';

export function ProjectsPanel({ projects }: { projects: Project[] }) {
  return (
    <div className="w-full lg:w-72 xl:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-neutral-200 dark:border-neutral-800 p-5 bg-white/50 dark:bg-[#0c0e14]/50 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Projects ({projects.length})
        </h3>
        <button
          type="button"
          onClick={() => alert('Project options')}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* New Project Button */}
      <Link
        href="/projects/new"
        className="flex items-center justify-between p-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-white bg-white dark:bg-[#161a26] transition group"
      >
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white">
          New Project
        </span>
        <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition">
          <Plus className="w-3.5 h-3.5" />
        </div>
      </Link>

      {/* Project list cards */}
      <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
        {projects.map((proj) => {
          const isVerified = proj.status === 'completed' || proj.ownership_pct > 80;

          return (
            <Link
              key={proj.id}
              href={`/projects`}
              className="block p-3 rounded-xl bg-white dark:bg-[#161a26] border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition shadow-2xs group"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h4 className="text-xs font-semibold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-1">
                  {proj.repo_full_name.split('/')[1] || proj.repo_full_name}
                </h4>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{proj.ownership_pct}%</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-500 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>Pending</span>
                  </span>
                )}
              </div>

              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-2">
                {proj.summary}
              </p>

              <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  {proj.is_fork ? 'Forked' : 'Author'}
                </span>
                <span>•</span>
                <span>{proj.concepts_count || 6} concepts verified</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
