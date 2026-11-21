'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Misc';
import type { CodeRef, Course, Lesson } from '@/types/learning';
import { api, ApiError, usePoll, CodeRefChip, Markdown, StateCard, ErrorNote, Spinner } from './shared';
import { loadErrorText } from './shared';

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
}

export function CourseTab({ projectId, conceptsReady, onGoToConcepts, onGoToQuiz, onOpenFile, onChanged }: Props) {
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
                    level === l.value ? 'border-ink bg-paper' : 'border-line hover:border-line-2'
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
                  <span className="text-[15px] font-medium">{l.label}</span>
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
}: {
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
  const readerRef = useRef<HTMLDivElement>(null);

  const current: Lesson | undefined =
    lessons.find((l) => l.id === lessonId) || lessons.find((l) => !done.has(l.id)) || lessons[0];
  const idx = current ? lessons.findIndex((l) => l.id === current.id) : -1;
  const doneCount = lessons.filter((l) => done.has(l.id)).length;
  const pct = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;
  const allDone = !generating && lessons.length > 0 && doneCount === lessons.length;

  const select = (id: string) => {
    setLessonId(id);
    setSaveError(null);
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
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4 items-start">
        {/* Outline */}
        <nav aria-label="Course outline" className="pj-card overflow-hidden lg:sticky lg:top-6">
          <div className="p-5 border-b border-line">
            <h3 className="font-serif text-[24px] leading-tight">{course.title || 'Your course'}</h3>
            {generating ? (
              <div className="mt-3" aria-live="polite">
                <div className="flex items-center gap-2 text-[13.5px] text-muted">
                  <Spinner className="w-3.5 h-3.5" />
                  <span className="truncate">{course.status_detail || 'Writing lessons…'}</span>
                </div>
                <div className="mt-2 h-[3px] bg-line rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink rounded-full transition-[width] duration-300 ease-land"
                    style={{ width: `${Math.max(3, Math.round((course.progress || 0) * 100))}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <div className="flex justify-between text-[13px] text-muted">
                  <span>
                    {doneCount} of {lessons.length} lessons done
                  </span>
                  <span className="tabular-nums">{pct}%</span>
                </div>
                <div className="mt-2 h-[3px] bg-line rounded-full overflow-hidden">
                  <div className="h-full bg-ink rounded-full transition-[width] duration-300 ease-land" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
          </div>
          <ol className="max-h-[50vh] lg:max-h-[calc(100vh-260px)] overflow-y-auto py-2">
            {course.modules.map((m, mi) => (
              <li key={m.id} className="px-3 py-2">
                <div className="px-2 pb-1 text-[12.5px] text-muted">
                  Module {mi + 1}
                  <span className="block text-[14px] text-ink font-medium leading-snug">{m.title}</span>
                </div>
                <ol>
                  {m.lessons.map((l) => {
                    const isCur = current?.id === l.id;
                    const isDone = done.has(l.id);
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => select(l.id)}
                          aria-current={isCur ? 'true' : undefined}
                          className={cn(
                            'w-full text-left flex items-start gap-2.5 px-2 py-2 rounded-[10px] text-[14px] transition-colors duration-200 cursor-pointer',
                            isCur ? 'bg-paper text-ink' : 'text-ink-2 hover:bg-paper'
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'mt-[2px] w-[18px] h-[18px] shrink-0 rounded-full border grid place-items-center',
                              isDone ? 'bg-[#E6F5D0] border-[#CFE6AE] text-[#3F6212]' : 'border-line-2'
                            )}
                          >
                            {isDone && <Check className="w-3 h-3" strokeWidth={2.5} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn('block leading-snug', isCur && 'font-medium')}>{l.title}</span>
                            <span className="sr-only">{isDone ? ' (done)' : ''}</span>
                          </span>
                          <span className="shrink-0 text-[12px] text-muted tabular-nums">{l.minutes} min</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </li>
            ))}
            {generating && (
              <li className="px-5 py-3 space-y-2" aria-hidden="true">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </li>
            )}
          </ol>
          {!generating && (
            <div className="px-5 py-3 border-t border-line">
              <Button size="sm" variant="invisible" onClick={onRegenerate} disabled={regenerating} icon={<RefreshCw className="w-3.5 h-3.5" />} className="-ml-3">
                Rebuild course
              </Button>
            </div>
          )}
        </nav>

        {/* Reader */}
        <div ref={readerRef} className="min-w-0 scroll-mt-6">
          {allDone && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-5 py-4 rounded-m border border-[#B9D84A] bg-lime-soft">
              <p className="text-[15px] text-ink">You finished every lesson. Take the quiz to earn the certificate.</p>
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
            <article key={current.id} className="pj-card p-6 sm:p-10 lg:p-12">
              <div className="max-w-[68ch]">
                <div className="flex items-center gap-3 text-[13px] text-muted">
                  <span>
                    Lesson {idx + 1} of {lessons.length}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {current.minutes} min
                  </span>
                </div>
                <h2 className="pj-display text-[clamp(32px,3.4vw,44px)] mt-3">{current.title}</h2>

                {current.code_refs.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5" aria-label="Code this lesson quotes">
                    {current.code_refs.map((r, i) => (
                      <CodeRefChip key={`${r.path}-${i}`} codeRef={r} onOpen={onOpenFile} />
                    ))}
                  </div>
                )}

                <Markdown size="read" className="mt-7">
                  {current.body_md}
                </Markdown>

                {current.check_questions.length > 0 && (
                  <section className="mt-10 pt-6 border-t border-line">
                    <h3 className="font-serif text-[24px]">Check yourself</h3>
                    <p className="text-[14px] text-muted mt-1">Answer these in your head before moving on. The quiz asks similar things.</p>
                    <ol className="mt-4 space-y-2.5">
                      {current.check_questions.map((q, i) => (
                        <li key={i} className="flex gap-3 text-[16px] leading-[1.55]">
                          <span className="shrink-0 font-serif text-[20px] leading-[1.2] text-muted w-5 text-right">{i + 1}</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {saveError && (
                  <div className="mt-6">
                    <ErrorNote message={saveError} onRetry={() => toggleDone(current)} />
                  </div>
                )}

                <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
                  <Button
                    variant="invisible"
                    size="sm"
                    disabled={idx <= 0}
                    onClick={() => idx > 0 && select(lessons[idx - 1].id)}
                    className="-ml-3"
                  >
                    Previous lesson
                  </Button>
                  <div className="flex items-center gap-2">
                    {done.has(current.id) ? (
                      <Button onClick={() => toggleDone(current)} disabled={saving || generating}>
                        <Check className="w-4 h-4 text-[#3F6212]" />
                        Done. Mark as not done
                      </Button>
                    ) : (
                      <Button variant="primary" onClick={() => toggleDone(current)} disabled={saving || generating}>
                        Mark lesson done
                      </Button>
                    )}
                    {idx < lessons.length - 1 && (
                      <Button onClick={() => select(lessons[idx + 1].id)}>Next lesson</Button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
