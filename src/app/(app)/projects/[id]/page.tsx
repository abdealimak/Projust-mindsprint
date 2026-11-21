'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, RefreshCw, Trash2, GitBranch, ShieldCheck, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IngestionStepper } from '@/components/project/IngestionStepper';
import { OverviewTab } from '@/components/project/OverviewTab';
import { FilesTab } from '@/components/project/FilesTab';
import { AskTab } from '@/components/project/AskTab';
import { ConceptsTab } from '@/components/learning/ConceptsTab';
import { CourseTab } from '@/components/learning/CourseTab';
import { QuizTab } from '@/components/learning/QuizTab';
import { CertificateTab } from '@/components/learning/CertificateTab';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Misc';
import { ProjectSummary } from '@/lib/ai/schemas';
import type { CodeRef, LearningSummary } from '@/types/learning';

interface ProjectDetails {
  id: string;
  repo_full_name: string;
  repo_url: string;
  status: string;
  status_detail: string;
  default_branch: string;
  commit_sha?: string;
  primary_language?: string;
  ownership_pct?: number;
  ownership_status?: string;
  file_count?: number;
  summary?: ProjectSummary | null;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'files', label: 'Files' },
  { id: 'ask', label: 'Ask the tutor' },
  { id: 'concepts', label: 'Concepts' },
  { id: 'course', label: 'Course' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'certificate', label: 'Certificate' },
] as const;
type TabType = (typeof TABS)[number]['id'];

function parseTab(v: string | null): TabType {
  if (v === 'cert') return 'certificate';
  return (TABS.find((t) => t.id === v)?.id as TabType) || 'overview';
}

function parseLines(v: string | null): [number, number] | null {
  if (!v) return null;
  const m = v.match(/^(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  const a = Number(m[1]);
  return [a, m[2] ? Number(m[2]) : a];
}

type FileRow = { path: string; language: string; size_bytes: number; line_count: number; content: string };

export default function ProjectWorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = params.id as string;

  const activeTab = parseTab(searchParams.get('tab'));
  const filePath = searchParams.get('path');
  const fileLines = parseLines(searchParams.get('lines'));

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFoundMsg, setNotFoundMsg] = useState<string | null>(null);
  const [learning, setLearning] = useState<LearningSummary | null>(null);
  const [askQuestion, setAskQuestion] = useState<string | null>(searchParams.get('q'));

  const [dialog, setDialog] = useState<null | 'resync' | 'delete'>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const setTab = useCallback(
    (tab: TabType, extra?: Record<string, string>) => {
      const sp = new URLSearchParams();
      if (tab !== 'overview') sp.set('tab', tab);
      if (extra) Object.entries(extra).forEach(([k, v]) => sp.set(k, v));
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  const fetchProjectData = useCallback(async () => {
    try {
      const [statusRes, filesRes] = await Promise.all([
        fetch(`/api/projects/${id}/status`),
        fetch(`/api/projects/${id}/files`),
      ]);
      if (statusRes.ok) {
        setProject(await statusRes.json());
        setLoadError(null);
      } else if (statusRes.status === 404) {
        const body = await statusRes.json().catch(() => null);
        setNotFoundMsg(typeof body?.error === 'string' ? body.error : null);
      } else {
        setLoadError(`The project did not load (${statusRes.status}).`);
      }
      if (filesRes.ok) {
        const fData = await filesRes.json();
        if (fData.files) setFiles(fData.files);
      }
    } catch {
      setLoadError('The project did not load. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchLearning = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}/learning`, { cache: 'no-store' });
      if (res.ok) setLearning(await res.json());
    } catch {
      /* step indicator just stays empty */
    }
  }, [id]);

  useEffect(() => {
    fetchProjectData();
    fetchLearning();
  }, [fetchProjectData, fetchLearning]);

  // Keep the active pill visible when the tab strip scrolls on narrow screens.
  useEffect(() => {
    document
      .querySelector<HTMLElement>('[role="tablist"] [aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTab, loading]);

  const openFile = useCallback(
    (ref: CodeRef) => setTab('files', { path: ref.path, lines: `${ref.startLine}-${ref.endLine}` }),
    [setTab]
  );

  const repoName = project?.repo_full_name.split('/').pop() || 'project';

  const confirmResync = async () => {
    setBusy(true);
    setDialogError(null);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error();
      setDialog(null);
      fetchProjectData();
    } catch {
      setDialogError('Re-sync did not start. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    setDialogError(null);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push('/projects');
    } catch {
      setDialogError(`${repoName} was not deleted. Try again in a moment.`);
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="px-5 sm:px-10 lg:px-14 py-10 lg:py-12 max-w-[1320px] mx-auto w-full space-y-6" aria-busy="true" aria-label="Loading project">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-11 w-full max-w-[720px] rounded-full" />
        <Skeleton className="h-[420px] w-full rounded-m" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-16 text-center flex flex-col items-center gap-3">
        <h2 className="pj-display text-[40px]">{loadError ? 'Project did not load' : 'Project not found'}</h2>
        <p className="text-muted text-[15px] max-w-[48ch]">
          {loadError || notFoundMsg || 'It may have been deleted, or it belongs to another account.'}
        </p>
        <div className="flex gap-2 mt-4">
          {loadError && (
            <Button variant="primary" onClick={fetchProjectData}>
              Try again
            </Button>
          )}
          <Link href="/projects" className="pj-btn pj-btn-ghost">
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  const isReady = project.status === 'ready';
  const conceptsReady = learning?.concepts_status === 'ready';

  return (
    <div className="px-5 sm:px-10 lg:px-14 py-10 lg:py-12 max-w-[1320px] mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-line">
        <div className="min-w-0">
          <h1 className="pj-display text-[clamp(32px,3.6vw,48px)] break-words">{project.repo_full_name}</h1>
          <div className="flex items-center gap-x-4 gap-y-1.5 text-[13px] text-muted mt-3 flex-wrap">
            {project.ownership_pct !== undefined && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-[#E6F5D0] text-[#3F6212] border border-[#CFE6AE]">
                <ShieldCheck className="w-3.5 h-3.5" />
                {project.ownership_status === 'verified'
                  ? `Verified author, ${project.ownership_pct}% of commits`
                  : `${project.ownership_pct}% of commits`}
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-mono text-[12px]">
              <GitBranch className="w-3.5 h-3.5" />
              {project.default_branch || 'main'}
            </span>
            {project.commit_sha && <span className="font-mono text-[12px]">{project.commit_sha.slice(0, 7)}</span>}
            {project.primary_language && <span>{project.primary_language}</span>}
            {project.file_count !== undefined && <span>{project.file_count} files indexed</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="pj-btn pj-btn-ghost !min-h-[36px] !px-3.5 text-[13px]">
            <ExternalLink className="w-3.5 h-3.5" />
            GitHub
          </a>
          <Button size="sm" onClick={() => { setDialogError(null); setDialog('resync'); }} icon={<RefreshCw className="w-3.5 h-3.5" />} className="h-9">
            Re-sync
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => { setDialogError(null); setDialog('delete'); }}
            aria-label={`Delete ${repoName}`}
            title={`Delete ${repoName}`}
            className="h-9 w-9 !px-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {isReady && <FlowSteps summary={learning} activeTab={activeTab} onGo={(t) => setTab(t)} />}

      {/* Pill tabs */}
      <div className="max-w-full overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="tablist" aria-label="Project sections" className="flex p-1 gap-0.5 rounded-full border border-line bg-sheet text-[14px] font-medium w-max">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              disabled={!isReady && t.id !== 'overview'}
              onClick={() => setTab(t.id)}
              className={cn(
                'h-9 px-4 rounded-full transition-colors duration-200 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:text-[#A8A39A]',
                activeTab === t.id ? 'bg-olive text-[#F6F8EC] shadow-pill' : 'text-ink-2 hover:bg-paper'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {!isReady ? (
        <IngestionStepper
          projectId={id}
          initialStatus={project.status}
          initialDetail={project.status_detail}
          onReady={() => {
            fetchProjectData();
            fetchLearning();
          }}
        />
      ) : (
        <div role="tabpanel" aria-label={TABS.find((t) => t.id === activeTab)?.label}>
          {activeTab === 'overview' && (
            <OverviewTab
              summary={project.summary || null}
              onAskQuestion={(q) => {
                setAskQuestion(q);
                setTab('ask');
              }}
            />
          )}
          {activeTab === 'files' && (
            <FilesTab key={`${filePath || ''}:${fileLines?.join('-') || ''}`} files={files} initialFilePath={filePath} initialLines={fileLines} />
          )}
          {activeTab === 'ask' && <AskTab projectId={id} initialQuestion={askQuestion} files={files} />}
          {activeTab === 'concepts' && <ConceptsTab projectId={id} onOpenFile={openFile} onChanged={fetchLearning} />}
          {activeTab === 'course' && (
            <CourseTab
              projectId={id}
              conceptsReady={conceptsReady}
              onGoToConcepts={() => setTab('concepts')}
              onGoToQuiz={() => setTab('quiz')}
              onOpenFile={openFile}
              onChanged={fetchLearning}
            />
          )}
          {activeTab === 'quiz' && (
            <QuizTab
              projectId={id}
              conceptsReady={conceptsReady}
              onGoToConcepts={() => setTab('concepts')}
              onGoToCourse={() => setTab('course')}
              onChanged={fetchLearning}
            />
          )}
          {activeTab === 'certificate' && <CertificateTab projectId={id} onGoToQuiz={() => setTab('quiz')} />}
        </div>
      )}

      <Dialog
        open={dialog === 'resync'}
        onClose={() => !busy && setDialog(null)}
        title={`Re-sync ${repoName}?`}
        description="We pull the latest commit from GitHub, re-index the files and refresh the summary. Your course, quiz attempts and certificates stay."
        actions={
          <>
            <Button onClick={() => setDialog(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmResync} disabled={busy} data-autofocus>
              {busy ? 'Starting…' : `Re-sync ${repoName}`}
            </Button>
          </>
        }
      >
        {dialogError && <p role="alert" className="text-[14px] text-[#B4232C]">{dialogError}</p>}
      </Dialog>

      <Dialog
        open={dialog === 'delete'}
        onClose={() => !busy && setDialog(null)}
        title={`Delete ${repoName}?`}
        description="This removes the project, its indexed files, tutor threads, course and quiz attempts. It cannot be undone. Your GitHub repository is not touched."
        actions={
          <>
            <Button onClick={() => setDialog(null)} disabled={busy} data-autofocus>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={busy}
              className="bg-warn border-warn text-white hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(229,72,77,.6)]"
            >
              {busy ? 'Deleting…' : `Delete ${repoName}`}
            </Button>
          </>
        }
      >
        {dialogError && <p role="alert" className="text-[14px] text-[#B4232C]">{dialogError}</p>}
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------ Flow steps */

type StepState = 'done' | 'active' | 'todo' | 'failed';

function FlowSteps({
  summary,
  activeTab,
  onGo,
}: {
  summary: LearningSummary | null;
  activeTab: TabType;
  onGo: (t: TabType) => void;
}) {
  const s = summary;
  const course = s?.course;
  const attempt = s?.latest_attempt;

  const steps: { tab: TabType; label: string; state: StepState; note: string }[] = [
    {
      tab: 'concepts',
      label: 'Concepts',
      state:
        s?.concepts_status === 'ready' ? 'done' : s?.concepts_status === 'generating' ? 'active' : s?.concepts_status === 'failed' ? 'failed' : 'todo',
      note:
        s?.concepts_status === 'ready'
          ? 'Mapped'
          : s?.concepts_status === 'generating'
            ? 'Mapping…'
            : s?.concepts_status === 'failed'
              ? 'Failed, retry'
              : 'Not mapped',
    },
    {
      tab: 'course',
      label: 'Course',
      state: !course
        ? 'todo'
        : course.status === 'failed'
          ? 'failed'
          : course.status === 'ready' && course.lessons_total > 0 && course.lessons_done >= course.lessons_total
            ? 'done'
            : 'active',
      note: !course
        ? 'Not built'
        : course.status === 'generating'
          ? 'Writing…'
          : course.status === 'failed'
            ? 'Failed, retry'
            : `${course.lessons_done} of ${course.lessons_total} lessons`,
    },
    {
      tab: 'quiz',
      label: 'Quiz',
      state: !attempt ? 'todo' : attempt.unlocked ? 'done' : attempt.status === 'failed' ? 'failed' : 'active',
      note: !attempt
        ? 'Not started'
        : attempt.status === 'submitted'
          ? `Attempt ${attempt.attempt_no}: ${attempt.average ?? '-'}`
          : attempt.status === 'generating'
            ? 'Writing questions…'
            : `Attempt ${attempt.attempt_no} open`,
    },
    {
      tab: 'certificate',
      label: 'Certificate',
      state: s?.certificate_code ? 'done' : 'todo',
      note: s?.certificate_code ? 'Issued' : 'Locked',
    },
  ];
  const nextIdx = steps.findIndex((st) => st.state !== 'done');

  return (
    <ol aria-label="Learning steps" className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {steps.map((st, i) => {
        const isNext = i === nextIdx;
        const isOpen = activeTab === st.tab;
        return (
          <li key={st.tab} className="min-w-0">
            <button
              type="button"
              onClick={() => onGo(st.tab)}
              aria-current={isOpen ? 'step' : undefined}
              className={cn(
                'w-full h-full text-left flex items-center gap-3 px-3.5 py-3 rounded-[14px] border transition-colors duration-200 cursor-pointer',
                isOpen ? 'border-ink bg-sheet' : 'border-line bg-sheet hover:border-line-2'
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'w-7 h-7 shrink-0 rounded-full grid place-items-center text-[13px] font-medium tabular-nums border',
                  st.state === 'done'
                    ? 'bg-[#E6F5D0] border-[#CFE6AE] text-[#3F6212]'
                    : st.state === 'failed'
                      ? 'bg-[#FDECEC] border-[#F5CFCF] text-[#B4232C]'
                      : isNext
                        ? 'bg-lime border-[#B9D84A] text-ink'
                        : 'bg-paper border-line text-muted'
                )}
              >
                {st.state === 'done' ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-medium text-ink leading-tight">{st.label}</span>
                <span className={cn('block text-[12.5px] truncate', st.state === 'failed' ? 'text-[#B4232C]' : 'text-muted')}>
                  {summary ? st.note : ' '}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
