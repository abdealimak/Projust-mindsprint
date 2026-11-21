import React from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import { Plus, GitBranch } from 'lucide-react';

export function ProjectsPanel({ projects }: { projects: Project[] }) {
  return (
    <aside className="w-full xl:w-[340px] shrink-0 border-t xl:border-t-0 xl:border-l border-line bg-paper-2 px-5 sm:px-6 py-8 flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-[28px] leading-none">Projects</h3>
        <Link href="/projects" className="text-[13.5px] text-muted hover:text-ink transition-colors">
          View all ({projects.length})
        </Link>
      </div>

      <Link
        href="/projects/new"
        className="group flex items-center justify-between h-12 px-4 rounded-2xl border border-dashed border-line-2 bg-sheet hover:border-ink transition-colors"
      >
        <span className="text-[14px] font-medium">New project</span>
        <span className="w-7 h-7 rounded-full bg-paper grid place-items-center text-muted group-hover:bg-ink group-hover:text-paper transition-colors">
          <Plus className="w-4 h-4" />
        </span>
      </Link>

      <ul className="flex flex-col gap-2.5">
        {projects.map((proj) => {
          const name = proj.repo_full_name.split('/')[1] || proj.repo_full_name;
          const ready = proj.status === 'completed' || proj.status === 'ready' || proj.status === 'in_progress';
          const ownershipTone =
            proj.ownership_pct >= 80 ? 'bg-[#E6F5D0] text-[#3F6212]' : proj.ownership_pct >= 50 ? 'bg-[#FDF3DC] text-[#8A5A0B]' : 'bg-paper text-muted';

          return (
            <li key={proj.id}>
              <Link
                href={`/projects/${proj.id}`}
                className="block p-4 rounded-2xl bg-sheet border border-line pj-card-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-[15px] font-semibold tracking-[-0.01em] truncate">{name}</h4>
                  {ready ? (
                    <span className={`font-mono text-[11px] px-2 py-0.5 rounded-full shrink-0 ${ownershipTone}`}>
                      {proj.ownership_pct}% yours
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-full shrink-0 bg-paper text-muted">
                      {proj.status === 'failed' ? 'Failed' : 'Reading'}
                    </span>
                  )}
                </div>
                {proj.summary && (
                  <p className="text-[13.5px] text-muted line-clamp-2 leading-snug mt-1.5">{proj.summary}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-[12.5px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5" />
                    {proj.is_fork ? 'Fork' : 'Author'}
                  </span>
                  {typeof proj.concepts_count === 'number' && <span>{proj.concepts_count} concepts</span>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
