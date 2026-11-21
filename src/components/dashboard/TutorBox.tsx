'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/types';
import { Button } from '@/components/ui/Button';
import { PaperAirplaneIcon, CommentDiscussionIcon, RepoIcon } from '@primer/octicons-react';

export function TutorBox({ projects }: { projects: Project[] }) {
  const [selectedProject, setSelectedProject] = useState(projects[0]?.repo_full_name || '');
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const params = new URLSearchParams({
      project: selectedProject,
      q: query.trim(),
    });
    router.push(`/tutor?${params.toString()}`);
  };

  return (
    <div className="rounded-xl border border-border bg-gradient-to-b from-canvas-subtle to-canvas p-5 shadow-sm transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <CommentDiscussionIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-fg">Ask Your Project Tutor</h2>
            <p className="text-[12px] text-fg-muted">
              Get explanations grounded directly in your codebase files and commit history.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RepoIcon className="w-3.5 h-3.5 text-fg-muted" />
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="text-[12px] bg-canvas-subtle border border-border rounded-lg px-2.5 py-1 text-fg font-medium focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.repo_full_name}>
                {p.repo_full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleAsk} className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Why did we store the session in cookies instead of localStorage?"
          className="w-full bg-canvas border border-border rounded-lg px-4 py-2.5 text-[13px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent pr-14 shadow-inner"
        />
        <div className="absolute right-1.5">
          <Button
            type="submit"
            size="sm"
            variant="primary"
            className="h-8 px-3"
            disabled={!query.trim()}
          >
            <PaperAirplaneIcon className="w-3.5 h-3.5 mr-1" />
            <span>Ask</span>
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/50 text-[11px] text-fg-muted">
        <span className="font-semibold uppercase tracking-wider text-[10px]">Quick Prompts:</span>
        <button
          type="button"
          onClick={() => setQuery('How does the webhook signature verification protect against replays?')}
          className="px-2 py-0.5 rounded border border-border hover:border-accent hover:text-accent transition-colors truncate max-w-xs"
        >
          &ldquo;Webhook signature replay defense&rdquo;
        </button>
        <button
          type="button"
          onClick={() => setQuery('Explain the database connection pooling and query isolation.')}
          className="px-2 py-0.5 rounded border border-border hover:border-accent hover:text-accent transition-colors truncate max-w-xs"
        >
          &ldquo;Connection pooling strategy&rdquo;
        </button>
      </div>
    </div>
  );
}
