import React from 'react';
import Link from 'next/link';
import { Project } from '@/types';
import type { LearningSummary } from '@/types/learning';
import { Plus, GitBranch, FolderGit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JOURNEY, nextStep } from './journey';

function ownershipTone(pct: number) {
  if (pct >= 80) return 'bg-[#E6F5D0] text-[#3F6212] border-[#CFE6AE]';
  if (pct >= 50) return 'bg-[#FDF3DC] text-[#8A5A0B] border-[#F1DEAF]';
  return 'bg-paper text-muted border-line';
}

/** Right rail on wide screens, a section under the main column on smaller ones. */
export function ProjectsPanel({
  projects,
  summaries = [],
}: {
  projects: Project[];
  summaries?: LearningSummary[];
}) {
  const byId = new Map(summaries.map((s) => [s.project_id, s]));

  return (
    <aside
      aria-labelledby="projects-panel-title"
      className="w-full xl:w-[340px] shrink-0 border-t xl:border-t-0 xl:border-l border-line bg-paper-2 px-4 sm:px-10 xl:px-6 py-8 xl:py-10"
    >
      <div className="max-w-[880px] xl:max-w-none mx-auto flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="projects-panel-title" className="font-serif text-[28px] leading-none">
            Projects
          </h2>
          {projects.length > 0 && (
            <Link href="/projects" className="text-[13.5px] text-muted hover:text-ink underline-offset-2 hover:underline">
              View all ({projects.length})
            </Link>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-2 bg-sheet px-5 py-7 text-center">
            <span className="mx-auto w-10 h-10 rounded-[12px] grid place-items-center bg-paper border border-line text-muted">
              <FolderGit2 className="w-[18px] h-[18px]" aria-hidden />
            </span>
            <p className="mt-3 text-[15px] font-semibold">No projects yet</p>
            <p className="mt-1 text-[13.5px] text-muted leading-snug">
              Import a repository you built. It shows up here with its progress.
            </p>
            <Link href="/projects/new" className="pj-btn pj-btn-sm mt-4">
              <Plus className="w-4 h-4" aria-hidden />
              Import a repository
            </Link>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5">
              {projects.map((proj) => {
                const [owner, repoName] = proj.repo_full_name.split('/');
                const name = repoName || proj.repo_full_name;
                const failed = proj.status === 'failed';
                const reading = proj.status === 'analyzing';
                const summary = byId.get(proj.id);
                const step = summary ? nextStep(summary) : null;
                const stageLabel = step
                  ? step.index >= JOURNEY.length
                    ? 'Certified'
                    : `Step ${step.index + 1} of ${JOURNEY.length}: ${JOURNEY[step.index].label}`
                  : null;

                return (
                  <li key={proj.id}>
                    <Link
                      href={`/projects/${proj.id}`}
                      className="block h-full p-4 rounded-2xl bg-sheet border border-line pj-card-hover"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-semibold tracking-[-0.01em] truncate">{name}</h3>
                          {owner && repoName && (
                            <p className="font-mono text-[11.5px] text-muted truncate">{owner}</p>
                          )}
                        </div>
                        {failed || reading ? (
                          <span
                            className={cn(
                              'text-[11.5px] font-medium px-2 py-0.5 rounded-full shrink-0 border',
                              failed ? 'bg-[#FDECEC] text-[#B4232C] border-[#F5CFCF]' : 'bg-paper text-muted border-line'
                            )}
                          >
                            {failed ? 'Import failed' : 'Reading code'}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'text-[11.5px] font-medium px-2 py-0.5 rounded-full shrink-0 border tabular-nums',
                              ownershipTone(proj.ownership_pct)
                            )}
                            title="Share of the code written by you, from commit history"
                          >
                            {proj.ownership_pct}% yours
                          </span>
                        )}
                      </div>
                      {proj.summary && (
                        <p className="text-[13.5px] text-muted line-clamp-2 leading-snug mt-2">{proj.summary}</p>
                      )}
                      {step && stageLabel && (
                        <div className="mt-3">
                          <div className="flex gap-1" aria-hidden>
                            {JOURNEY.map((s, i) => (
                              <span
                                key={s.id}
                                className={cn(
                                  'h-1 flex-1 rounded-full',
                                  i < step.index ? 'bg-ink' : i === step.index ? 'bg-lime' : 'bg-line'
                                )}
                              />
                            ))}
                          </div>
                          <p className="mt-1.5 text-[12.5px] text-ink-2">{stageLabel}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-[12.5px] text-muted">
                        <span className="inline-flex items-center gap-1">
                          <GitBranch className="w-3.5 h-3.5" aria-hidden />
                          {proj.is_fork ? 'Fork' : 'Author'}
                        </span>
                        {proj.commit_sha && (
                          <span className="font-mono text-[11.5px]">{proj.commit_sha.slice(0, 7)}</span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <Link
              href="/projects/new"
              className="group flex items-center justify-between h-12 px-4 rounded-2xl border border-dashed border-line-2 bg-sheet/60 hover:bg-sheet hover:border-ink transition-colors"
            >
              <span className="text-[14px] font-medium">Import another repository</span>
              <span className="w-7 h-7 rounded-full bg-paper grid place-items-center text-muted group-hover:bg-ink group-hover:text-paper transition-colors">
                <Plus className="w-4 h-4" aria-hidden />
              </span>
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}
