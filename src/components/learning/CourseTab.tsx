'use client';
import { markLearningDay } from '@/components/dashboard/Streak';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock, RefreshCw, ArrowLeft, ArrowRight, ChevronDown, BookOpen, FileCode, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Misc';
import type { CodeRef, Course, Lesson } from '@/types/learning';
import { api, ApiError, usePoll, CodeRefChip, Markdown, StateCard, ErrorNote, Spinner, Bar } from './shared';
import { loadErrorText } from './shared';
import { VideoButton } from '@/components/video/VideoButton';

type Level = 'beginner' | 'intermediate' | 'advanced';
const LEVELS: { value: Level; label: string; hint: string }[] = [
  { value: 'beginner', label: 'Beginner', hint: 'Explains the basics before your code' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Assumes you know the language' },
  { value: 'advanced', label: 'Advanced', hint: 'Goes straight to trade-offs and edge cases' },
];

interface Props {
  projectId: string;
  conceptsReady: boolean;
  onGoToConcepts: () => void;
  onGoToQuiz: () => void;
  onOpenFile: (ref: CodeRef) => void;
  onChanged?: () => void;
  /** Indexed files, used to show a lesson's code in its explainer video. */
  files?: { path: string; content: string }[];
  repo?: string | null;
}

/** Plain-text summary of a lesson for its video: first paragraph, markdown removed. */
function lessonSummary(md: string): string {
  const para = md
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith('#') && !p.startsWith('```') && !p.startsWith('|')) || '';
  const text = para
    .replace(/\[\[([^\]]+)\]\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 320 ? `${text.slice(0, 317).replace(/\s+\S*$/, '')}…` : text;
}

export function CourseTab({ projectId, conceptsReady, onGoToConcepts, onGoToQuiz, onOpenFile, onChanged, files, repo }: Props) {
  useEffect(() => markLearningDay(projectId, 'course'), [projectId]);
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [level, setLevel] = useState<Level>('intermediate');
  const [starting, setStarting] = useState(false);
  const statusRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ course: Course | null }>(`/api/projects/${projectId}/course`);
      const st = res.course?.status ?? null;
      if (statusRef.current === 'generating' && st !== 'generating') onChanged?.();
      statusRef.current = st;
      setCourse(res.course);
      setLoadError(null);
    } catch (e) {
      setLoadError(loadErrorText(e, 'Could not load the course.'));
    }
  }, [projectId, onChanged]);

  useEffect(() => {
    load();
  }, [load]);

  usePoll(load, course?.status === 'generating');

  const generate = async (regenerate: boolean) => {
    setStarting(true);
    setActionError(null);
    try {
      const res = await api<{ course: Course }>(`/api/projects/${projectId}/course`, {
        method: 'POST',
        json: { level, regenerate },
      });
      statusRef.current = res.course.status;
      setCourse(res.course);
      onChanged?.();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setActionError('The concept map is not ready yet. Map the concepts first, then build the course.');
      } else {
        setActionError(e instanceof Error ? `${e.message} Try again in a moment.` : 'Could not start the course.');
      }
    } finally {
      setStarting(false);
    }
  };

  if (course === undefined && loadError) {
    return (
      <StateCard
        tone="error"
        title="The course did not load."
        body={<p>{loadError}</p>}
        action={<Button onClick={load}>Try again</Button>}
      />
    );
  }

  if (course === undefined) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4" aria-busy="true" aria-label="Loading course">
        <Skeleton className="h-[420px] rounded-m" />
        <Skeleton className="h-[420px] rounded-m" />
      </div>
    );
  }

  if (!course) {
    if (!conceptsReady) {
      return (
        <StateCard
          icon={<BookOpen className="w-5 h-5" />}
          title="Map the concepts"
          em="before the course."
          body={<p>Each lesson teaches one part of the concept map and quotes the lines it comes from. Map the concepts first, then come back here.</p>}
          action={
            <Button variant="primary" onClick={onGoToConcepts}>
              Go to concepts
            </Button>
          }
        />
      );
    }
    return (
      <div className="space-y-3">
        {actionError && <ErrorNote message={actionError} />}
        <div className="pj-card px-6 py-10 sm:px-12 sm:py-14">
          <div className="max-w-[640px] mx-auto text-center">
            <h3 className="pj-display text-[clamp(30px,3.2vw,40px)]">
              Build a course <em>from your own code.</em>
            </h3>
            <p className="mt-4 text-[15.5px] text-muted">
              Short lessons, one module per group of concepts, each with self-check questions. Pick how much
              background you want.
            </p>
          </div>
          <fieldset className="mt-8 max-w-[640px] mx-auto">
            <legend className="sr-only">Course level</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {LEVELS.map((l) => (
                <label
                  key={l.value}
                  className={cn(
                    'relative flex flex-col gap-1 p-4 rounded-[12px] border cursor-pointer transition-colors duration-200',
                    'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--orange)]',
                    level === l.value ? 'border-ink bg-paper-2 shadow-[0_0_0_3px_#CDEB5A]' : 'border-line hover:border-line-2'
                  )}
                >
                  <input
                    type="radio"
                    name="course-level"
                    value={l.value}
                    checked={level === l.value}
                    onChange={() => setLevel(l.value)}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between gap-2 text-[15px] font-medium">
                    {l.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'w-[18px] h-[18px] rounded-full border-[1.5px] grid place-items-center',
                        level === l.value ? 'bg-ink border-ink' : 'border-line-2'
                      )}
                    >
                      {level === l.value && <span className="w-1.5 h-1.5 rounded-full bg-paper" />}
                    </span>
                  </span>
                  <span className="text-[13px] text-muted">{l.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-8 flex justify-center">
            <Button variant="primary" size="lg" onClick={() => generate(false)} disabled={starting}>
              {starting && <Spinner />}
              {starting ? 'Starting…' : 'Build the course'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (course.status === 'failed') {
    return (
      <div className="space-y-3">
        {actionError && <ErrorNote message={actionError} />}
        <StateCard
          tone="error"
          title="The course stopped building."
          body={<p>{course.status_detail || 'Something went wrong while writing lessons.'} Build it again; the concept map is kept.</p>}
          action={
            <Button variant="primary" onClick={() => generate(true)} disabled={starting}>
              {starting && <Spinner />}
              Build again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <CourseReader
      projectId={projectId}
      course={course}
      setCourse={setCourse}
      onOpenFile={onOpenFile}
      onGoToQuiz={onGoToQuiz}
      onRegenerate={() => generate(true)}
      regenerating={starting}
      actionError={actionError}
      onChanged={onChanged}
      files={files}
      repo={repo}
    />
  );
}


function CourseReader({
  projectId,
  course,
  setCourse,
  onOpenFile,
  onGoToQuiz,
  onRegenerate,
  regenerating,
  actionError,
  onChanged,
  files,
  repo,
}: {
  files?: { path: string; content: string }[];
  repo?: string | null;
  projectId: string;
  course: Course;
  setCourse: React.Dispatch<React.SetStateAction<Course | null | undefined>>;
  onOpenFile: (r: CodeRef) => void;
  onGoToQuiz: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
  actionError: string | null;
  onChanged?: () => void;
}) {
  const generating = course.status === 'generating';
  const lessons = useMemo(() => course.modules.flatMap((m) => m.lessons), [course.modules]);
  const done = useMemo(() => new Set(course.completed_lesson_ids), [course.completed_lesson_ids]);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);

  const current: Lesson | undefined =
    lessons.find((l) => l.id === lessonId) || lessons.find((l) => !done.has(l.id)) || lessons[0];
  const idx = current ? lessons.findIndex((l) => l.id === current.id) : -1;
  const moduleIdx = current ? course.modules.findIndex((m) => m.lessons.some((l) => l.id === current.id)) : -1;
  const doneCount = lessons.filter((l) => done.has(l.id)).length;
  const pct = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;
  const allDone = !generating && lessons.length > 0 && doneCount === lessons.length;
  const minutesLeft = lessons.filter((l) => !done.has(l.id)).reduce((t, l) => t + (l.minutes || 0), 0);
  const isDone = !!current && done.has(current.id);

  const select = (id: string) => {
    setLessonId(id);
    setSaveError(null);
    setOutlineOpen(false);
    requestAnimationFrame(() => {
      const el = readerRef.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
    });
  };

  const toggleDone = async (lesson: Lesson) => {
    const next = !done.has(lesson.id);
    const prevIds = course.completed_lesson_ids;
    const optimistic = next ? [...prevIds, lesson.id] : prevIds.filter((x) => x !== lesson.id);
    setCourse((c) => (c ? { ...c, completed_lesson_ids: optimistic } : c));
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api<{ completed_lesson_ids: string[] }>(
        `/api/projects/${projectId}/course/lessons/${encodeURIComponent(lesson.id)}`,
        { method: 'POST', json: { done: next } }
      );
      setCourse((c) => (c ? { ...c, completed_lesson_ids: res.completed_lesson_ids } : c));
      onChanged?.();
      if (next && idx >= 0 && idx < lessons.length - 1) select(lessons[idx + 1].id);
    } catch (e) {
      setCourse((c) => (c ? { ...c, completed_lesson_ids: prevIds } : c));
      setSaveError(`${e instanceof Error ? e.message : 'Could not save.'} Your progress was not saved; try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {actionError && <ErrorNote message={actionError} />}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start">
        {/* Outline */}
        <nav aria-label="Course outline" className="pj-card overflow-hidden lg:sticky lg:top-6">
          <div className="p-5 border-b border-line">
            <p className="text-[12.5px] text-muted">Course</p>
            <h3 className="font-serif text-[24px] leading-[1.1] mt-0.5">{course.title || 'Your course'}</h3>
            {generating ? (
              <div className="mt-4" aria-live="polite">
                <div className="flex items-center gap-2 text-[13.5px] text-muted">
                  <Spinner className="w-3.5 h-3.5" />
                  <span className="truncate">{course.status_detail || 'Writing lessons…'}</span>
                </div>
                <Bar className="mt-2" value={Math.max(3, Math.round((course.progress || 0) * 100))} label="Course writing progress" />
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex items-baseline justify-between text-[13px] text-muted">
                  <span>
                    <span className="text-ink font-medium tabular-nums">{doneCount}</span> of {lessons.length} lessons done
                  </span>
                  <span className="tabular-nums">{pct}%</span>
                </div>
                <Bar className="mt-2" value={pct} tone={allDone ? 'pass' : 'ink'} label="Lessons completed" />
                {!allDone && minutesLeft > 0 && <p className="mt-2 text-[12.5px] text-muted">About {minutesLeft} min left</p>}
              </div>
            )}
            <button
              type="button"
              onClick={() => setOutlineOpen((o) => !o)}
              aria-expanded={outlineOpen}
              aria-controls="course-outline-list"
              className="lg:hidden mt-4 w-full flex items-center justify-between h-10 px-4 rounded-full border border-line text-[14px] font-medium hover:border-line-2 cursor-pointer"
            >
              {outlineOpen ? 'Hide lessons' : `All lessons${current ? `: now on ${idx + 1} of ${lessons.length}` : ''}`}
              <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', outlineOpen && 'rotate-180')} aria-hidden="true" />
            </button>
          </div>
          <ol
            id="course-outline-list"
            className={cn('max-h-[60vh] lg:max-h-[calc(100vh-320px)] overflow-y-auto py-2', !outlineOpen && 'hidden lg:block')}
          >
            {course.modules.map((m, mi) => {
              const mDone = m.lessons.filter((l) => done.has(l.id)).length;
              const complete = m.lessons.length > 0 && mDone === m.lessons.length;
              return (
                <li key={m.id} className="px-3 py-2">
                  <div className="flex items-start gap-2.5 px-2 pb-1.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-[1px] w-6 h-6 shrink-0 rounded-full grid place-items-center text-[12px] tabular-nums border',
                        complete ? 'bg-[#E6F5D0] border-[#CFE6AE] text-[#3F6212]' : mi === moduleIdx ? 'bg-lime border-[#B9D84A] text-ink' : 'bg-paper-2 border-line text-muted'
                      )}
                    >
                      {complete ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : mi + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] text-muted">
                        Module {mi + 1}
                        <span className="sr-only">{complete ? ', complete' : ''}</span>
                      </span>
                      <span className="block text-[14px] text-ink font-medium leading-snug">{m.title}</span>
                    </span>
                    <span className="shrink-0 text-[12px] text-muted tabular-nums mt-[1px]">
                      {mDone}/{m.lessons.length}
                    </span>
                  </div>
                  <ol className="ml-[22px] pl-3 border-l border-line">
                    {m.lessons.map((l) => {
                      const isCur = current?.id === l.id;
                      const lDone = done.has(l.id);
                      return (
                        <li key={l.id}>
                          <button
                            type="button"
                            onClick={() => select(l.id)}
                            aria-current={isCur ? 'true' : undefined}
                            className={cn(
                              'relative w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-[10px] text-[14px] transition-colors duration-200 cursor-pointer',
                              isCur ? 'bg-paper text-ink' : 'text-ink-2 hover:bg-paper-2'
                            )}
                          >
                            {isCur && <span aria-hidden="true" className="absolute -left-[13.5px] top-2 bottom-2 w-[2px] rounded-full bg-ink" />}
                            <span
                              aria-hidden="true"
                              className={cn(
                                'mt-[2px] w-[18px] h-[18px] shrink-0 rounded-full border grid place-items-center',
                                lDone ? 'bg-[#3F7F1F] border-[#3F7F1F] text-white' : isCur ? 'border-ink' : 'border-line-2'
                              )}
                            >
                              {lDone && <Check className="w-3 h-3" strokeWidth={3} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={cn('block leading-snug', isCur && 'font-medium', lDone && !isCur && 'text-muted')}>{l.title}</span>
                              <span className="sr-only">{lDone ? ' (done)' : ''}</span>
                            </span>
                            <span className="shrink-0 text-[12px] text-muted tabular-nums">{l.minutes} min</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </li>
              );
            })}
            {generating && (
              <li className="px-5 py-3 space-y-2" aria-hidden="true">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </li>
            )}
          </ol>
          {!generating && (
            <div className={cn('px-5 py-3 border-t border-line', !outlineOpen && 'hidden lg:block')}>
              <Button size="sm" variant="invisible" onClick={onRegenerate} disabled={regenerating} icon={regenerating ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />} className="-ml-3">
                Rebuild course
              </Button>
            </div>
          )}
        </nav>

        {/* Reader */}
        <div ref={readerRef} className="min-w-0 scroll-mt-6 space-y-4">
          {allDone && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 rounded-m border border-[#B9D84A] bg-lime-soft">
              <p className="text-[15px] text-ink flex items-center gap-2.5">
                <span aria-hidden="true" className="w-7 h-7 rounded-full bg-[#3F7F1F] text-white grid place-items-center shrink-0">
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                </span>
                You finished every lesson. Take the quiz to earn the certificate.
              </p>
              <Button variant="primary" size="sm" onClick={onGoToQuiz}>
                Take the quiz
              </Button>
            </div>
          )}
          {!current ? (
            <div className="pj-card p-8 sm:p-12 space-y-4" aria-busy="true">
              <p className="text-[15px] text-muted">The first lesson appears here as soon as it is written.</p>
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : (
            <article key={current.id} className="pj-card overflow-hidden" aria-labelledby={`lesson-${current.id}`}>
              <header className="px-6 sm:px-10 lg:px-12 pt-6 sm:pt-10 pb-6 border-b border-line">
                <div className="max-w-[68ch]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
                    {moduleIdx >= 0 && (
                      <span className="text-ink-2">
                        Module {moduleIdx + 1}: {course.modules[moduleIdx].title}
                      </span>
                    )}
                    <span aria-hidden="true" className="w-1 h-1 rounded-full bg-line-2" />
                    <span className="tabular-nums">
                      Lesson {idx + 1} of {lessons.length}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      {current.minutes} min read
                    </span>
                    {isDone && (
                      <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-[#E6F5D0] border border-[#CFE6AE] text-[#3F6212] text-[12px] font-medium">
                        <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
                        Done
                      </span>
                    )}
                  </div>
                  <h2 id={`lesson-${current.id}`} className="pj-display text-[clamp(32px,3.4vw,46px)] mt-3 text-balance">
                    {current.title}
                  </h2>
                  <div className="mt-4">
                    <VideoButton
                      kind="explainer"
                      label="Watch lesson video"
                      title={current.title}
                      description="A short animated version of this lesson."
                      video={{
                        kicker: `Lesson ${idx + 1} · ${current.minutes} min`,
                        title: current.title,
                        summary: lessonSummary(current.body_md || '') || current.title,
                        repo: repo ?? null,
                        code: lessonCode(current, files),
                        question: current.check_questions?.[0] ?? null,
                      }}
                    />
                  </div>

                  {current.code_refs.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[12.5px] text-muted mb-2 inline-flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5" aria-hidden="true" />
                        Code this lesson reads. Click to open it.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {current.code_refs.map((r, i) => (
                          <CodeRefChip key={`${r.path}-${i}`} codeRef={r} onOpen={onOpenFile} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </header>

              <div className="px-6 sm:px-10 lg:px-12 py-8">
                <Markdown size="read" onOpenRef={onOpenFile}>
                  {current.body_md}
                </Markdown>

                {current.check_questions.length > 0 && (
                  <section className="mt-10 max-w-[68ch] rounded-[16px] border border-line bg-paper-2 p-5 sm:p-6">
                    <h3 className="font-serif text-[24px] leading-tight">Check yourself</h3>
                    <p className="text-[14px] text-muted mt-1">
                      Answer these out loud or on paper before moving on. The quiz asks similar things.
                    </p>
                    <ol className="mt-4 space-y-2">
                      {current.check_questions.map((q, i) => (
                        <li key={i} className="flex gap-3 rounded-[12px] bg-sheet border border-line px-4 py-3 text-[15.5px] leading-[1.55]">
                          <span className="shrink-0 font-serif text-[20px] leading-[1.15] text-muted w-5 text-right tabular-nums">{i + 1}</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {saveError && (
                  <div className="mt-6 max-w-[68ch]">
                    <ErrorNote message={saveError} onRetry={() => toggleDone(current)} />
                  </div>
                )}
              </div>

              <footer className="flex flex-wrap items-center gap-3 px-6 sm:px-10 lg:px-12 py-4 border-t border-line bg-paper-2">
                <Button
                  variant="invisible"
                  size="sm"
                  disabled={idx <= 0}
                  onClick={() => idx > 0 && select(lessons[idx - 1].id)}
                  className="-ml-3"
                  icon={<ArrowLeft className="w-3.5 h-3.5" />}
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Back</span>
                </Button>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {isDone ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 text-[14px] text-[#3F6212] font-medium" role="status">
                        <Check className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                        Marked done
                      </span>
                      <Button size="sm" variant="invisible" onClick={() => toggleDone(current)} disabled={saving || generating} icon={<Undo2 className="w-3.5 h-3.5" />}>
                        Undo
                      </Button>
                    </>
                  ) : (
                    <Button variant="primary" onClick={() => toggleDone(current)} disabled={saving || generating}>
                      {saving ? <Spinner /> : <Check className="w-4 h-4" strokeWidth={2.5} />}
                      {saving ? 'Saving…' : idx < lessons.length - 1 ? 'Mark done and continue' : 'Mark done'}
                    </Button>
                  )}
                  {idx < lessons.length - 1 ? (
                    <Button onClick={() => select(lessons[idx + 1].id)} icon={<ArrowRight className="w-4 h-4" />} className="flex-row-reverse">
                      Next
                    </Button>
                  ) : allDone ? (
                    <Button variant="primary" onClick={onGoToQuiz}>
                      Take the quiz
                    </Button>
                  ) : null}
                </div>
              </footer>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

/** The first cited range of a lesson whose file is indexed, as text for the video. */
function lessonCode(lesson: Lesson, files?: { path: string; content: string }[]) {
  for (const r of lesson.code_refs || []) {
    const f = files?.find((x) => x.path === r.path);
    if (!f?.content) continue;
    const lines = f.content.split('\n');
    if (!(r.startLine >= 1) || r.startLine > lines.length) continue;
    const end = Math.min(Math.max(r.endLine || r.startLine, r.startLine), r.startLine + 15, lines.length);
    return { path: r.path, startLine: r.startLine, text: lines.slice(r.startLine - 1, end).join('\n') };
  }
  return null;
}
