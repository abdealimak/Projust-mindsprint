'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RepoIcon, PlusIcon, SearchIcon, ArrowRightIcon } from '@primer/octicons-react';

export function TopProjects({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState('');

  const filtered = projects.filter((p) =>
    p.repo_full_name.toLowerCase().includes(filter.toLowerCase())
  );

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'analyzing':
        return <Badge variant="attention">Analyzing</Badge>;
      case 'ready':
        return <Badge variant="accent">Ready</Badge>;
      case 'in_progress':
        return <Badge variant="purple">In Progress</Badge>;
      case 'completed':
        return <Badge variant="success">Certified</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-canvas-subtle p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <div>
          <h2 className="text-[14px] font-semibold text-fg flex items-center gap-2">
            <RepoIcon className="w-4 h-4 text-accent" />
            <span>Your Repositories</span>
          </h2>
          <p className="text-[11px] text-fg-muted">
            {projects.length} projects analyzed
          </p>
        </div>
        <Link href="/projects/new">
          <Button size="sm" variant="primary" icon={<PlusIcon className="w-3 h-3" />}>
            New
          </Button>
        </Link>
      </div>

      {/* Filter box */}
      <div className="mb-3">
        <div className="flex items-center px-2.5 py-1.5 rounded-lg border border-border bg-canvas text-fg-muted focus-within:border-accent">
          <SearchIcon className="w-3.5 h-3.5 mr-2 shrink-0 text-fg-muted" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter repositories…"
            className="w-full bg-transparent text-[12px] text-fg placeholder:text-fg-muted focus:outline-none"
          />
        </div>
      </div>

      {/* Project list */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-[12px] text-fg-muted">
            No projects match &ldquo;{filter}&rdquo;
          </div>
        ) : (
          filtered.slice(0, 5).map((project) => (
            <Link
              key={project.id}
              href={`/projects`}
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-canvas-inset transition-colors group border border-transparent hover:border-border"
            >
              <div className="min-w-0 pr-2">
                <div className="text-[13px] font-medium text-fg group-hover:text-accent truncate">
                  {project.repo_full_name}
                </div>
                <div className="text-[11px] text-fg-muted font-mono">
                  {project.ownership_pct}% commit ownership
                </div>
              </div>
              <div className="shrink-0">{getStatusBadge(project.status)}</div>
            </Link>
          ))
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-border">
        <Link
          href="/projects"
          className="flex items-center justify-center gap-1.5 text-[12px] text-accent hover:underline font-medium w-full text-center"
        >
          <span>View all {projects.length} repositories</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
