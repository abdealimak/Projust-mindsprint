'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, RefreshCw, Trash2, GitBranch, ShieldCheck, Check, GitCommitHorizontal, FileCode, ChevronLeft, AlertCircle, Lock } from 'lucide-react';
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
  // The tutor stays mounted after the first visit so a conversation survives a trip to Files.
  const [askVisited, setAskVisited] = useState(activeTab === 'ask');
  useEffect(() => {
    if (activeTab === 'ask') setAskVisited(true);
  }, [activeTab]);
  const indexedPaths = useMemo(() => new Set(files.map((f) => f.path)), [files]);

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
      <div className="px-4 sm:px-10 lg:px-14 pt-8 pb-16 sm:pt-10 lg:pt-12 max-w-[1320px] mx-auto w-full space-y-6" aria-busy="true" aria-label="Loading project">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-[76px] w-full rounded-m" />
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

  const repoOwner = project.repo_full_name.includes('/') ? project.repo_full_name.split('/')[0] : null;
  const steps = buildSteps(learning);
  const nextStep = steps.find((st) => st.state !== 'done');

  return (
    <div className="px-4 sm:px-10 lg:px-14 pt-8 pb-16 sm:pt-10 lg:pt-12 max-w-[1320px] mx-auto w-full space-y-6">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-6 border-b border-line">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-muted">
            <Link href="/projects" className="inline-flex items-center gap-1 hover:text-ink transition-colors duration-150 -ml-1 px-1 rounded">
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Projects
            </Link>
            {repoOwner && (
              <>
                <span aria-hidden="true" className="text-line-2">/</span>
                <span className="font-mono text-[12.5px] truncate">{repoOwner}</span>
              </>
            )}
          </nav>
          <h1 className="pj-display text-[clamp(34px,4vw,52px)] mt-2 break-words">{repoName}</h1>
          {project.summary?.oneLiner && (
            <p className="mt-2 text-[15.5px] text-muted max-w-[68ch]">{project.summary.oneLiner}</p>
          )}
          <ul className="flex items-center gap-x-2 gap-y-2 text-[13px] text-ink-2 mt-4 flex-wrap" aria-label="Project details">
            {project.ownership_pct !== undefined && project.ownership_pct !== null && (
              <li
                className={cn(
                  'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12.5px] font-medium border',
                  project.ownership_status === 'verified'
                    ? 'bg-[#E6F5D0] text-[#3F6212] border-[#CFE6AE]'
                    : 'bg-sheet text-ink-2 border-line'
                )}
                title="Share of commits on the default branch made by you"
              >
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                {project.ownership_status === 'verified'
                  ? `Verified author, ${project.ownership_pct}% of commits`
                  : `${project.ownership_pct}% of commits`}
              </li>
            )}
            <li className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-line bg-sheet font-mono text-[12px]">
              <GitBranch className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              {project.default_branch || 'main'}
              {project.commit_sha && (
                <>
                  <GitCommitHorizontal className="w-3.5 h-3.5 text-muted ml-1" aria-hidden="true" />
                  <span title={project.commit_sha}>{project.commit_sha.slice(0, 7)}</span>
                </>
              )}
            </li>
            {project.primary_language && (
              <li className="inline-flex items-center h-7 px-2.5 rounded-full border border-line bg-sheet text-[12.5px]">{project.primary_language}</li>
            )}
            {project.file_count !== undefined && project.file_count !== null && (
              <li className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-line bg-sheet text-[12.5px]">
                <FileCode className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                {project.file_count} files indexed
              </li>
            )}
          </ul>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="pj-btn pj-btn-ghost !min-h-[36px] !px-3.5 text-[13px]">
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
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
      </header>

      {isReady && <FlowSteps steps={steps} loaded={!!learning} activeTab={activeTab} onGo={(t) => setTab(t)} />}

      {/* Pill tabs: explore the code, then learn it */}
      <div className="max-w-full overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="tablist" aria-label="Project sections" className="flex items-center p-1 gap-0.5 rounded-full border border-line bg-sheet text-[14px] font-medium w-max">
          {TABS.map((t, i) => (
            <React.Fragment key={t.id}>
              {i === 3 && <span aria-hidden="true" className="mx-1.5 w-px h-5 bg-line" />}
              <button
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={activeTab === t.id}
                aria-controls="project-tabpanel"
                disabled={!isReady && t.id !== 'overview'}
                onClick={() => setTab(t.id)}
                className={cn(
                  'h-9 px-4 rounded-full transition-colors duration-200 whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:text-[#A8A39A]',
                  activeTab === t.id ? 'bg-olive text-[#F6F8EC] shadow-pill' : 'text-ink-2 hover:bg-paper'
                )}
              >
                {t.label}
                {t.id === 'certificate' && isReady && learning && !learning.certificate_code && (
                  <Lock className="w-3 h-3 opacity-60" aria-label="locked" />
                )}
              </button>
            </React.Fragment>
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
        <div role="tabpanel" id="project-tabpanel" aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'overview' && (
            <OverviewTab
              summary={project.summary || null}
              onAskQuestion={(q) => {
                setAskQuestion(q);
                setTab('ask');
              }}
              onOpenPath={(p) => setTab('files', { path: p })}
              indexedPaths={indexedPaths}
              onStartLearning={nextStep ? () => setTab(nextStep.tab) : undefined}
              startLabel={nextStep?.cta}
            />
          )}
          {activeTab === 'files' && (
            <FilesTab key={`${filePath || ''}:${fileLines?.join('-') || ''}`} files={files} initialFilePath={filePath} initialLines={fileLines} />
          )}
          {askVisited && (
            <div hidden={activeTab !== 'ask'}>
              <AskTab
                projectId={id}
                initialQuestion={askQuestion}
                files={files}
                onOpenFile={openFile}
                suggestions={project.summary?.suggestedQuestions}
                repoName={repoName}
              />
            </div>
          )}
          {activeTab === 'concepts' && (
            <ConceptsTab
              projectId={id}
              onOpenFile={openFile}
              onChanged={fetchLearning}
              files={files}
              onAsk={(q) => {
                setAskQuestion(q);
                setTab('ask');
              }}
            />
          )}
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
type Step = { tab: TabType; label: string; state: StepState; note: string; cta: string };

function buildSteps(s: LearningSummary | null): Step[] {
  const course = s?.course;
  const attempt = s?.latest_attempt;
  return [
    {
      tab: 'concepts',
      label: 'Concepts',
      cta: s?.concepts_status === 'failed' ? 'Retry the concept map' : 'Map the concepts',
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
      cta: !course ? 'Build the course' : 'Continue the course',
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
      cta: !attempt ? 'Take the quiz' : attempt.status === 'submitted' ? 'Try the quiz again' : 'Continue the quiz',
      state: !attempt ? 'todo' : attempt.unlocked ? 'done' : attempt.status === 'failed' ? 'failed' : 'active',
      note: !attempt
        ? 'Not started'
        : attempt.status === 'submitted'
          ? `Attempt ${attempt.attempt_no}: ${attempt.average ?? '-'} avg`
          : attempt.status === 'generating'
            ? 'Writing questions…'
            : `Attempt ${attempt.attempt_no} open`,
    },
    {
      tab: 'certificate',
      label: 'Certificate',
      cta: 'View the certificate',
      state: s?.certificate_code ? 'done' : 'todo',
      note: s?.certificate_code ? 'Issued' : 'Locked until the quiz passes',
    },
  ];
}

function FlowSteps({
  steps,
  loaded,
  activeTab,
  onGo,
}: {
  steps: Step[];
  loaded: boolean;
  activeTab: TabType;
  onGo: (t: TabType) => void;
}) {
  const nextIdx = steps.findIndex((st) => st.state !== 'done');
  const doneCount = steps.filter((st) => st.state === 'done').length;

  return (
    <section aria-label="Learning progress" className="pj-card p-2 sm:p-2.5">
      <ol className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-0">
        {steps.map((st, i) => {
          const isNext = loaded && i === nextIdx;
          const isOpen = activeTab === st.tab;
          const done = st.state === 'done';
          return (
            <li key={st.tab} className="relative min-w-0">
              {/* connector to the next step (desktop) */}
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'hidden md:block absolute top-1/2 -right-2 w-4 h-px z-[1]',
                    done ? 'bg-[#9BC46A]' : 'bg-line-2'
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => onGo(st.tab)}
                aria-current={isOpen ? 'step' : undefined}
                className={cn(
                  'w-full h-full text-left flex items-center gap-3 px-3 py-2.5 md:mx-1 md:w-[calc(100%-8px)] rounded-[14px] border transition-colors duration-200 cursor-pointer',
                  isOpen ? 'border-ink bg-sheet' : isNext ? 'border-[#DCEBA4] bg-lime-soft hover:border-[#B9D84A]' : 'border-transparent hover:bg-paper-2'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'w-8 h-8 shrink-0 rounded-full grid place-items-center text-[13px] font-medium tabular-nums border',
                    done
                      ? 'bg-[#3F7F1F] border-[#3F7F1F] text-white'
                      : st.state === 'failed'
                        ? 'bg-[#FDECEC] border-[#F5CFCF] text-[#B4232C]'
                        : isNext
                          ? 'bg-lime border-[#B9D84A] text-ink'
                          : 'bg-paper border-line text-muted'
                  )}
                >
                  {done ? (
                    <Check className="w-4 h-4" strokeWidth={2.75} />
                  ) : st.state === 'failed' ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[14px] font-medium text-ink leading-tight">
                    {st.label}
                    {isNext && loaded && <span className="text-[11.5px] font-medium text-[#4A5A1E]">Next</span>}
                  </span>
                  <span className={cn('block text-[12.5px] truncate', st.state === 'failed' ? 'text-[#B4232C]' : 'text-muted')}>
                    {loaded ? st.note : ' '}
                  </span>
                  <span className="sr-only">{done ? ', done' : st.state === 'failed' ? ', failed' : isNext ? ', next step' : ''}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {loaded ? `${doneCount} of ${steps.length} steps done.` : ''}
      </p>
    </section>
  );
}
