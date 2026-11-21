'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Misc';
import { AskTab } from '@/components/project/AskTab';
import { StateCard } from '@/components/learning/shared';
import type { CodeRef } from '@/types/learning';

export interface TutorProject {
  id: string;
  repo_full_name: string;
}

type FileRow = { path: string; language: string; content: string };
type Loaded =
  | { kind: 'loading' }
  | { kind: 'ready'; files: FileRow[]; suggestions: string[] }
  | { kind: 'not-ready'; detail: string }
  | { kind: 'error'; message: string };

/**
 * The tutor outside a project page: pick one of your repositories, then ask.
 * Uses the same tutor as the project's "Ask the tutor" tab.
 */
export function TutorClient({ projects }: { projects: TutorProject[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const wanted = searchParams.get('project');
  const initialQuery = searchParams.get('q');

  const initial = projects.find((p) => p.repo_full_name === wanted || p.id === wanted) || projects[0] || null;
  const [projectId, setProjectId] = useState<string | null>(initial?.id ?? null);
  const [state, setState] = useState<Loaded>({ kind: 'loading' });
  const project = projects.find((p) => p.id === projectId) || null;

  const load = useCallback(async (id: string) => {
    setState({ kind: 'loading' });
    try {
      const [statusRes, filesRes] = await Promise.all([
        fetch(`/api/projects/${id}/status`, { cache: 'no-store' }),
        fetch(`/api/projects/${id}/files`, { cache: 'no-store' }),
      ]);
      const status = await statusRes.json().catch(() => null);
      if (!statusRes.ok) {
        setState({ kind: 'error', message: (status && typeof status.error === 'string' && status.error) || `The project did not load (${statusRes.status}).` });
        return;
      }
      if (status?.status !== 'ready') {
        setState({ kind: 'not-ready', detail: status?.status_detail || 'The repository is still being read.' });
        return;
      }
      const filesBody = filesRes.ok ? await filesRes.json().catch(() => null) : null;
      setState({
        kind: 'ready',
        files: (filesBody?.files as FileRow[]) || [],
        suggestions: (status?.summary?.suggestedQuestions as string[]) || [],
      });
    } catch {
      setState({ kind: 'error', message: 'The project did not load. Check your connection, then try again.' });
    }
  }, []);

  useEffect(() => {
    if (projectId) load(projectId);
  }, [projectId, load]);

  const choose = (id: string) => {
    setProjectId(id);
    const p = projects.find((x) => x.id === id);
    const sp = new URLSearchParams();
    if (p) sp.set('project', p.repo_full_name);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  const openFile = (r: CodeRef) => {
    if (!projectId) return;
    router.push(`/projects/${projectId}?tab=files&path=${encodeURIComponent(r.path)}&lines=${r.startLine}-${r.endLine}`);
  };

  return (
    <div className="px-4 sm:px-10 lg:px-14 pt-8 pb-16 sm:pt-10 lg:pt-12 max-w-[1240px] mx-auto w-full">
      <PageHeader
        eyebrow="Tutor"
        title="Ask about your code."
        em="Get the exact lines back."
        description="Answers are grounded in the repository you pick and cite the files and lines they come from."
        action={
          projects.length > 0 ? (
            <div className="flex flex-col gap-1.5 min-w-[240px]">
              <label htmlFor="tutor-project" className="text-[13px] text-muted">
                Repository
              </label>
              <div className="relative">
                <select
                  id="tutor-project"
                  value={projectId ?? ''}
                  onChange={(e) => choose(e.target.value)}
                  className="w-full h-11 pl-4 pr-10 rounded-full border border-line-2 bg-sheet font-mono text-[13.5px] text-ink appearance-none cursor-pointer focus:outline-none focus:border-ink"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.repo_full_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted" aria-hidden="true" />
              </div>
            </div>
          ) : undefined
        }
      />

      {projects.length === 0 || !project ? (
        <StateCard
          title="Import a repository"
          em="to ask about it."
          body={<p>The tutor answers from your own code, so it needs a repository first. Importing takes a minute or two.</p>}
          action={
            <Link href="/projects/new" className="pj-btn">
              Import a repository
            </Link>
          }
        />
      ) : state.kind === 'loading' ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading the tutor">
          <Skeleton className="h-[60vh] w-full rounded-m" />
        </div>
      ) : state.kind === 'error' ? (
        <StateCard
          tone="error"
          title="This repository did not load."
          body={<p>{state.message}</p>}
          action={
            <button type="button" onClick={() => load(project.id)} className="pj-btn pj-btn-ghost">
              Try again
            </button>
          }
        />
      ) : state.kind === 'not-ready' ? (
        <StateCard
          title="Still reading"
          em={project.repo_full_name.split('/').pop()}
          body={<p>{state.detail} The tutor opens as soon as the files are indexed.</p>}
          action={
            <Link href={`/projects/${project.id}`} className="pj-btn pj-btn-ghost">
              Open the project
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13.5px] text-muted">
            <p>
              Asking about <span className="font-mono text-[13px] text-ink">{project.repo_full_name}</span>,{' '}
              {state.files.length} files indexed.
            </p>
            <Link
              href={`/projects/${project.id}?tab=ask`}
              className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink underline-offset-2 hover:underline"
            >
              Open in the project workspace
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
          <AskTab
            key={project.id}
            projectId={project.id}
            initialQuestion={initialQuery}
            files={state.files}
            onOpenFile={openFile}
            suggestions={state.suggestions}
            repoName={project.repo_full_name.split('/').pop()}
            className="lg:h-[calc(100vh-340px)]"
          />
        </div>
      )}
    </div>
  );
}
