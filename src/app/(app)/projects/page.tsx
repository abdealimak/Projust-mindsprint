import React from 'react';
import Link from 'next/link';
import { FolderGit2, GitBranch, GitFork, MessagesSquare, Plus } from 'lucide-react';
import { getProjects, getLearningSummaries } from '@/lib/data';
import { Page, PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/Misc';
import { JOURNEY, nextStep } from '@/components/dashboard/journey';
import { cn } from '@/lib/utils';
import type { ProjectStatus } from '@/types';

const STATUS: Record<ProjectStatus, { label: string; tone: string }> = {
  analyzing: { label: 'Reading code', tone: 'bg-paper text-muted border-line' },
  ready: { label: 'Ready', tone: 'bg-[#E6F5D0] text-[#3F6212] border-[#CFE6AE]' },
  in_progress: { label: 'In progress', tone: 'bg-lime-soft text-ink border-[#DCEB9E]' },
  completed: { label: 'Completed', tone: 'bg-[#E6F5D0] text-[#3F6212] border-[#CFE6AE]' },
  failed: { label: 'Import failed', tone: 'bg-[#FDECEC] text-[#B4232C] border-[#F5CFCF]' },
};

function ownershipTone(pct: number) {
  if (pct >= 80) return 'text-pass';
  if (pct >= 50) return 'text-[#8A5A0B]';
  return 'text-muted';
}

export default async function ProjectsPage() {
  const [projects, summaries] = await Promise.all([getProjects(), getLearningSummaries()]);
  const byId = new Map(summaries.map((s) => [s.project_id, s]));

  return (
    <Page>
      <PageHeader
        eyebrow="Projects"
        title="Your repositories,"
        em="read line by line."
        description="Projust checks how much of each repo you wrote, maps its concepts and builds a course from it."
        action={
          projects.length > 0 && (
            <Link href="/projects/new" className="pj-btn">
              <Plus className="w-4 h-4" aria-hidden />
              Import a repository
            </Link>
          )
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 className="w-5 h-5" aria-hidden />}
          title="No projects yet"
          description="Import a GitHub repository you built. You get a summary, a tutor that knows your code and a course written from it."
          action={
            <Link href="/projects/new" className="pj-btn">
              Import a repository
            </Link>
          }
          secondaryAction={
            <Link href="/explore" className="pj-btn pj-btn-ghost">
              Find a project to build
            </Link>
          }
        />
      ) : (
        <>
          <p className="pj-section-title mb-4">
            {projects.length} {projects.length === 1 ? 'repository' : 'repositories'}
          </p>
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {projects.map((project) => {
              const [owner, repoName] = project.repo_full_name.split('/');
              const status = STATUS[project.status] ?? STATUS.ready;
              const summary = byId.get(project.id);
              const step = summary ? nextStep(summary) : null;
              const finished = step ? step.index >= JOURNEY.length : false;
              const failed = project.status === 'failed';

              return (
                <li key={project.id} className="pj-card p-5 sm:p-6 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[12.5px] text-muted truncate">{owner}</p>
                      <h2 className="mt-1 font-serif text-[28px] leading-[1.05] tracking-[-0.01em] break-words">
                        <Link href={`/projects/${project.id}`} className="hover:underline underline-offset-4 decoration-line-2">
                          {repoName || project.repo_full_name}
                        </Link>
                      </h2>
                    </div>
                    <span className={cn('shrink-0 text-[12px] font-medium px-2.5 py-0.5 rounded-full border', status.tone)}>
                      {status.label}
                    </span>
                  </div>

                  {project.summary && (
                    <p className="mt-3 text-[14.5px] text-ink-2 leading-relaxed line-clamp-3">{project.summary}</p>
                  )}

                  <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-muted">
                    {!failed && project.status !== 'analyzing' && (
                      <div className="flex items-center gap-1.5">
                        <dt>Written by you</dt>
                        <dd className={cn('font-semibold tabular-nums', ownershipTone(project.ownership_pct))}>
                          {project.ownership_pct}%
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <dt className="sr-only">Role</dt>
                      <dd className="inline-flex items-center gap-1">
                        {project.is_fork ? (
                          <GitFork className="w-3.5 h-3.5" aria-hidden />
                        ) : (
                          <GitBranch className="w-3.5 h-3.5" aria-hidden />
                        )}
                        {project.is_fork ? 'Fork' : 'Author'}
                      </dd>
                    </div>
                    {project.commit_sha && (
                      <div className="flex items-center gap-1.5">
                        <dt>Commit</dt>
                        <dd className="font-mono text-[12px] text-ink-2">{project.commit_sha.slice(0, 7)}</dd>
                      </div>
                    )}
                  </dl>

                  {step && !failed && (
                    <div className="mt-5 rounded-2xl bg-paper px-4 py-3">
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
                      <p className="mt-2 text-[13px] text-ink-2">
                        {finished ? (
                          'All five steps done. Certificate issued.'
                        ) : (
                          <>
                            <span className="text-muted">
                              Step {step.index + 1} of {JOURNEY.length}:
                            </span>{' '}
                            {step.title}
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-5 flex flex-wrap items-center gap-2">
                    {step && !failed ? (
                      <Link href={step.href} className="pj-btn pj-btn-sm">
                        {step.cta}
                      </Link>
                    ) : (
                      <Link href={`/projects/${project.id}`} className="pj-btn pj-btn-sm">
                        Open project
                      </Link>
                    )}
                    {!failed && (
                      <Link
                        href={`/tutor?project=${encodeURIComponent(project.repo_full_name)}`}
                        className="pj-btn pj-btn-ghost pj-btn-sm"
                      >
                        <MessagesSquare className="w-4 h-4" aria-hidden />
                        Ask the tutor
                      </Link>
                    )}
                    {step && !failed && (
                      <Link
                        href={`/projects/${project.id}`}
                        className="ml-auto text-[13.5px] text-muted hover:text-ink underline-offset-2 hover:underline"
                      >
                        Overview
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Page>
  );
}
