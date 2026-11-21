'use client';
import { markLearningDay } from '@/components/dashboard/Streak';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, X, ArrowLeft, ArrowRight, ListChecks, PenLine, Bug, Lightbulb, Award, Lock, ChevronDown, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Misc';
import { AspectRadar } from '@/components/charts/AspectRadar';
import {
  ASPECTS,
  ASPECT_LABELS,
  UNLOCK_AVERAGE,
  UNLOCK_FLOOR,
  type Aspect,
  type GradedAnswer,
  type PublicQuestion,
  type QuizAttempt,
} from '@/types/learning';
import { api, ApiError, usePoll, Markdown, CodeBlock, StateCard, ErrorNote, Spinner, Bar } from './shared';
import { loadErrorText } from './shared';

const TYPE_META: Record<PublicQuestion['type'], { label: string; hint: string; Icon: typeof ListChecks }> = {
  mcq: { label: 'Multiple choice', hint: 'Pick the one best answer.', Icon: ListChecks },
  free_text: { label: 'Explain', hint: 'Explain in your own words. Point to the code where you can.', Icon: PenLine },
  find_the_bug: { label: 'Find the bug', hint: 'Say which line is wrong, what goes wrong, and how you would fix it.', Icon: Bug },
  what_if: { label: 'What if', hint: 'Predict what would happen, and why.', Icon: Lightbulb },
};

/** Score tone: pass at the unlock average, warning between floor and average, below floor is red. */
function tone(score: number) {
  return score >= UNLOCK_AVERAGE ? 'pass' : score >= UNLOCK_FLOOR ? 'mid' : 'low';
}
const TONE_TEXT = { pass: 'text-[#3F6212]', mid: 'text-[#8A5A0B]', low: 'text-[#B4232C]' } as const;
const TONE_CHIP = {
  pass: 'bg-[#E6F5D0] border-[#CFE6AE] text-[#3F6212]',
  mid: 'bg-[#FDF3DC] border-[#F1DEAF] text-[#8A5A0B]',
  low: 'bg-[#FDECEC] border-[#F5CFCF] text-[#B4232C]',
} as const;

interface Props {
  projectId: string;
  conceptsReady: boolean;
  onGoToConcepts: () => void;
  onGoToCourse: () => void;
  onChanged?: () => void;
}

type View = { kind: 'home' } | { kind: 'play'; attemptId: string } | { kind: 'results'; attemptId: string };

export function QuizTab({ projectId, conceptsReady, onGoToConcepts, onGoToCourse, onChanged }: Props) {
  useEffect(() => markLearningDay(projectId, 'quiz'), [projectId]);
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [view, setView] = useState<View | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ attempts: QuizAttempt[] }>(`/api/projects/${projectId}/quiz`);
      setAttempts(res.attempts);
      setLoadError(null);
      return res.attempts;
    } catch (e) {
      setLoadError(loadErrorText(e, 'Could not load quiz attempts.'));
      return null;
    }
  }, [projectId]);

  useEffect(() => {
    load().then((list) => {
      if (!list) return;
      const open = list.find((a) => a.status === 'ready' || a.status === 'generating');
      setView(open ? { kind: 'play', attemptId: open.id } : { kind: 'home' });
    });
  }, [load]);

  const generatingId = attempts?.find((a) => a.status === 'generating')?.id;
  usePoll(async () => {
    await load();
  }, !!generatingId);

  const upsert = useCallback((a: QuizAttempt) => {
    setAttempts((list) => {
      if (!list) return [a];
      const i = list.findIndex((x) => x.id === a.id);
      if (i === -1) return [a, ...list];
      const next = list.slice();
      next[i] = a;
      return next;
    });
  }, []);

  const start = async () => {
    setStarting(true);
    setActionError(null);
    try {
      const res = await api<{ attempt: QuizAttempt }>(`/api/projects/${projectId}/quiz`, { method: 'POST' });
      upsert(res.attempt);
      setView({ kind: 'play', attemptId: res.attempt.id });
      onChanged?.();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const open = attempts?.find((a) => a.status === 'ready' || a.status === 'generating');
        if (open) {
          setView({ kind: 'play', attemptId: open.id });
          return;
        }
        setActionError(`${e.message} Map the concepts first, or finish the attempt you already started.`);
      } else {
        setActionError(e instanceof Error ? `${e.message} Try again in a moment.` : 'Could not start the quiz.');
      }
    } finally {
      setStarting(false);
    }
  };

  if (!attempts && loadError) {
    return (
      <StateCard
        tone="error"
        title="The quiz did not load."
        body={<p>{loadError}</p>}
        action={<Button onClick={load}>Try again</Button>}
      />
    );
  }

  if (!attempts || !view) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading quiz">
        <Skeleton className="h-[200px] rounded-m" />
        <Skeleton className="h-[120px] rounded-m" />
      </div>
    );
  }

  const current = view.kind !== 'home' ? attempts.find((a) => a.id === view.attemptId) : undefined;

  if (view.kind === 'play' && current) {
    if (current.status === 'generating') {
      return (
        <StateCard
          icon={<Spinner className="w-5 h-5" />}
          title={`Writing attempt ${current.attempt_no}.`}
          body={
            <p role="status">
              {current.status_detail || 'Choosing questions from your code. This takes about half a minute.'}
            </p>
          }
          action={<Button variant="invisible" size="sm" onClick={() => setView({ kind: 'home' })}>All attempts</Button>}
        />
      );
    }
    if (current.status === 'failed') {
      return (
        <StateCard
          tone="error"
          title="This attempt could not be written."
          body={<p>{current.status_detail || 'Question generation failed.'} Start a new attempt.</p>}
          action={
            <Button variant="primary" onClick={start} disabled={starting}>
              Start a new attempt
            </Button>
          }
        />
      );
    }
    if (current.status === 'ready') {
      return (
        <QuizPlayer
          attempt={current}
          onUpdate={upsert}
          onBack={() => setView({ kind: 'home' })}
          onSubmitted={(a) => {
            upsert(a);
            setView({ kind: 'results', attemptId: a.id });
            onChanged?.();
          }}
        />
      );
    }
  }

  if ((view.kind === 'results' || view.kind === 'play') && current?.status === 'submitted') {
    return (
      <QuizResults
        attempt={current}
        onBack={() => setView({ kind: 'home' })}
        onRetry={start}
        retrying={starting}
        onGoToCourse={onGoToCourse}
        actionError={actionError}
      />
    );
  }

  // Home: history + start
  const submitted = attempts.filter((a) => a.status === 'submitted');
  const open = attempts.find((a) => a.status === 'ready' || a.status === 'generating');
  const nextNo = (attempts.reduce((m, a) => Math.max(m, a.attempt_no), 0) || 0) + 1;
  const best = submitted.reduce<number | null>((m, a) => (a.average != null && (m == null || a.average > m) ? a.average : m), null);
  const mean = submitted.length
    ? Math.round(submitted.reduce((s, a) => s + (a.average || 0), 0) / submitted.length)
    : null;

  if (attempts.length === 0 && !conceptsReady) {
    return (
      <StateCard
        icon={<Target className="w-5 h-5" />}
        title="Map the concepts"
        em="before the quiz."
        body={<p>Questions are written from the concept map and quote your own code. Map the concepts first.</p>}
        action={
          <Button variant="primary" onClick={onGoToConcepts}>
            Go to concepts
          </Button>
        }
      />
    );
  }


  return (
    <div className="space-y-4">
      {actionError && <ErrorNote message={actionError} />}
      <div className="pj-card p-6 sm:p-10">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-6 items-end">
          <div>
            <h3 className="pj-display text-[clamp(30px,3.2vw,42px)]">
              Six skills, <em>scored on your code.</em>
            </h3>
            <p className="mt-4 text-[15.5px] text-muted max-w-[58ch]">
              Each attempt asks about your own repository. Every answer is graded on its own, with feedback, before
              you move on. The certificate unlocks with an average of {UNLOCK_AVERAGE} or more and no skill under{' '}
              {UNLOCK_FLOOR}.
            </p>
          </div>
          {open ? (
            <Button variant="primary" size="lg" onClick={() => setView({ kind: 'play', attemptId: open.id })}>
              Continue attempt {open.attempt_no}
            </Button>
          ) : (
            <Button variant="primary" size="lg" onClick={start} disabled={starting}>
              {starting && <Spinner />}
              {starting ? 'Writing questions…' : `Start attempt ${nextNo}`}
            </Button>
          )}
        </div>
        <ul className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="Question types">
          {(Object.keys(TYPE_META) as PublicQuestion['type'][]).map((t) => {
            const { label, hint, Icon } = TYPE_META[t];
            return (
              <li key={t} className="rounded-[14px] border border-line bg-paper-2 px-4 py-3">
                <span className="flex items-center gap-2 text-[14px] font-medium">
                  <Icon className="w-4 h-4 text-muted" aria-hidden="true" />
                  {label}
                </span>
                <span className="block mt-1 text-[12.5px] text-muted leading-snug">{hint}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {submitted.length > 0 && (
        <section className="pj-card overflow-hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-4 border-b border-line">
            <h3 className="text-[15px] font-semibold">Past attempts</h3>
            <p className="text-[13.5px] text-muted">
              Mean <span className="text-ink tabular-nums">{mean}</span>
              <span className="mx-2 text-line-2">|</span>
              Best <span className="text-ink tabular-nums">{best}</span>
            </p>
          </div>
          <ul className="divide-y divide-line">
            {submitted.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setView({ kind: 'results', attemptId: a.id })}
                  className="w-full text-left grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] items-center gap-4 sm:gap-6 px-5 py-4 hover:bg-paper-2 transition-colors duration-200 cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[15px] font-medium">
                      Attempt {a.attempt_no}
                      {a.unlocked && (
                        <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-[#E6F5D0] text-[#3F6212] border border-[#CFE6AE]">
                          Unlocked
                        </span>
                      )}
                    </span>
                    <span className="block text-[13px] text-muted mt-0.5">
                      {formatDate(a.submitted_at || a.created_at)}
                      {a.scores && (
                        <span className="ml-3">
                          Lowest: {lowest(a.scores).label} {lowest(a.scores).value}
                        </span>
                      )}
                    </span>
                  </span>
                  {a.scores && <MiniBars scores={a.scores} />}
                  <span className="font-serif text-[34px] leading-none tabular-nums">{a.average ?? '-'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Six tiny bars, one per skill, for the attempt list. */
function MiniBars({ scores }: { scores: NonNullable<QuizAttempt['scores']> }) {
  return (
    <span className="hidden sm:flex items-end gap-[3px] h-8" aria-hidden="true">
      {ASPECTS.map((a) => (
        <span key={a} className="w-[6px] h-full bg-line rounded-full overflow-hidden flex items-end" title={`${ASPECT_LABELS[a]} ${scores[a]}`}>
          <span
            className={cn('block w-full rounded-full', scores[a] < UNLOCK_FLOOR ? 'bg-warn' : 'bg-ink')}
            style={{ height: `${Math.max(6, Math.min(100, scores[a]))}%` }}
          />
        </span>
      ))}
    </span>
  );
}

function lowest(scores: NonNullable<QuizAttempt['scores']>) {
  let k: Aspect = ASPECTS[0];
  ASPECTS.forEach((a) => {
    if (scores[a] < scores[k]) k = a;
  });
  return { label: ASPECT_LABELS[k], value: scores[k] };
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

/** First line of a markdown prompt as plain text, for compact lists. */
function plainPrompt(md: string) {
  return (md.split('\n').find((l) => l.trim()) || md).replace(/[*_`#>]/g, '').trim();
}

/* ---------------------------------------------------------------- Player */

function QuizPlayer({
  attempt,
  onUpdate,
  onBack,
  onSubmitted,
}: {
  attempt: QuizAttempt;
  onUpdate: (a: QuizAttempt) => void;
  onBack: () => void;
  onSubmitted: (a: QuizAttempt) => void;
}) {
  const qs = attempt.questions;
  const answered = attempt.answers;
  const firstOpen = qs.findIndex((q) => !answered[q.id]);
  const [index, setIndex] = useState(firstOpen === -1 ? Math.max(0, qs.length - 1) : firstOpen);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const q = qs[index];
  const graded = q ? answered[q.id] : undefined;
  const answeredCount = qs.filter((x) => answered[x.id]).length;
  const allAnswered = qs.length > 0 && answeredCount === qs.length;
  const draft = q ? drafts[q.id] ?? '' : '';

  useEffect(() => {
    if (!pending) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [pending]);

  const go = (i: number) => {
    setIndex(i);
    setError(null);
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: false }));
  };

  const submitAnswer = async () => {
    if (!q || !draft.trim()) return;
    setPending(q.id);
    setError(null);
    try {
      const res = await api<{ graded: GradedAnswer }>(`/api/quiz/${attempt.id}/answer`, {
        method: 'POST',
        json: { questionId: q.id, answer: draft },
      });
      onUpdate({ ...attempt, answers: { ...attempt.answers, [q.id]: res.graded } });
    } catch (e) {
      setError(`${e instanceof Error ? e.message : 'Grading failed.'} Your answer is kept; submit it again.`);
    } finally {
      setPending(null);
    }
  };

  const finish = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<{ attempt: QuizAttempt }>(`/api/quiz/${attempt.id}/submit`, { method: 'POST' });
      onSubmitted(res.attempt);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError('Some questions are still unanswered. Answer every question, then finish.');
      } else {
        setError(`${e instanceof Error ? e.message : 'Scoring failed.'} Try again.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (qs.length === 0) {
    return (
      <StateCard
        tone="error"
        title="This attempt has no questions."
        body={<p>Go back and start a new attempt.</p>}
        action={<Button onClick={onBack}>Back to the quiz</Button>}
      />
    );
  }

  const isPending = pending === q.id;
  const meta = TYPE_META[q.type];
  const canQuoteLines = q.type === 'find_the_bug' && !graded && !isPending;

  const quoteLine = (n: number) => {
    setPicked((p) => ({ ...p, [q.id]: n }));
    setDrafts((d) => {
      const cur = d[q.id] ?? '';
      const add = `Line ${n}: `;
      return { ...d, [q.id]: cur.trim() ? `${cur.replace(/\s+$/, '')}\n${add}` : add };
    });
    requestAnimationFrame(() => {
      const el = textRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="invisible" size="sm" onClick={onBack} className="-ml-3" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
          All attempts
        </Button>
        <p className="text-[13.5px] text-muted tabular-nums">
          Attempt {attempt.attempt_no}. <span className="text-ink font-medium">{answeredCount}</span> of {qs.length} answered
        </p>
      </div>

      <div className="pj-card px-4 py-3 sm:px-5">
        <nav aria-label="Questions" className="flex flex-wrap gap-1.5">
          {qs.map((x, i) => {
            const g = answered[x.id];
            const reachable = !!g || i === firstOpen || i <= (firstOpen === -1 ? qs.length : firstOpen);
            const t = g ? tone(g.score) : null;
            return (
              <button
                key={x.id}
                type="button"
                disabled={!reachable}
                onClick={() => go(i)}
                aria-current={i === index ? 'step' : undefined}
                aria-label={`Question ${i + 1}, ${ASPECT_LABELS[x.aspect]}${g ? `, scored ${g.score}` : reachable ? ', not answered' : ', locked'}`}
                title={`${ASPECT_LABELS[x.aspect]}: ${TYPE_META[x.type].label}`}
                className={cn(
                  'relative h-9 min-w-9 px-2 rounded-full border text-[13px] tabular-nums transition-colors duration-200',
                  'disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
                  i === index
                    ? 'bg-ink text-paper border-ink'
                    : t
                      ? TONE_CHIP[t]
                      : 'bg-sheet border-line text-ink-2 hover:border-line-2'
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </nav>
        <Bar className="mt-3" value={(answeredCount / qs.length) * 100} />
      </div>

      <article className="pj-card overflow-hidden" aria-labelledby={`q-${q.id}`}>
        <div className="px-6 sm:px-10 pt-6 sm:pt-8">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="inline-flex items-center h-7 px-3 rounded-full border border-line bg-paper-2 text-ink-2 font-medium">
              {ASPECT_LABELS[q.aspect]}
            </span>
            <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-line text-ink-2">
              <meta.Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {meta.label}
            </span>
            <span className="ml-auto text-muted tabular-nums">
              Question {index + 1} of {qs.length}
            </span>
          </div>
          <h3 id={`q-${q.id}`} ref={headingRef} tabIndex={-1} className="sr-only">
            Question {index + 1}: {meta.label}
          </h3>
          <Markdown className="mt-5 !text-[18px] !leading-[1.55] max-w-[68ch] text-ink [&_p]:text-ink">{q.prompt_md}</Markdown>
          <p className="mt-2 text-[14px] text-muted">{meta.hint}</p>
        </div>

        {q.code && (
          <div className="px-6 sm:px-10 mt-5">
            <CodeBlock
              snippet={q.code.snippet}
              startLine={q.code.startLine}
              path={`${q.code.path}:${q.code.startLine}-${q.code.endLine}`}
              highlight={picked[q.id] ? [picked[q.id], picked[q.id]] : null}
              onLineClick={canQuoteLines ? quoteLine : undefined}
              lineLabel={(n) => `Quote line ${n} in your answer`}
              caption={canQuoteLines ? 'Click a line number to quote it' : undefined}
            />
          </div>
        )}

        <div className="px-6 sm:px-10 mt-6">
          {q.type === 'mcq' && q.options ? (
            <McqOptions
              qid={q.id}
              options={q.options}
              value={graded ? graded.answer : draft}
              disabled={!!graded || isPending}
              graded={graded}
              onChange={(v) => setDrafts((d) => ({ ...d, [q.id]: v }))}
            />
          ) : graded ? (
            <div className="rounded-[14px] border border-line bg-paper-2 px-4 py-3.5 text-[15px] leading-[1.6] whitespace-pre-wrap">
              <span className="block text-[12.5px] text-muted mb-1">Your answer</span>
              {graded.answer}
            </div>
          ) : (
            <div>
              <label htmlFor={`a-${q.id}`} className="block text-[14px] font-medium mb-2">
                Your answer
              </label>
              <textarea
                id={`a-${q.id}`}
                ref={textRef}
                rows={5}
                value={draft}
                disabled={isPending}
                onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    submitAnswer();
                  }
                }}
                aria-describedby={`a-${q.id}-help`}
                placeholder={
                  q.type === 'find_the_bug'
                    ? 'Line 23: the where clause … This means … I would fix it by …'
                    : q.type === 'what_if'
                      ? 'It would … because …'
                      : 'In my code, … because …'
                }
                className="w-full min-h-[120px] rounded-[14px] border border-line-2 bg-sheet px-4 py-3 text-[15.5px] leading-[1.6] resize-y placeholder:text-[#A8A39A] focus:outline-none focus:border-ink focus:shadow-[0_0_0_3px_rgba(17,17,16,.06)] transition-[border-color,box-shadow] duration-200 disabled:bg-paper-2"
              />
              <div id={`a-${q.id}-help`} className="mt-1.5 flex justify-between gap-3 text-[12.5px] text-muted">
                <span className="hidden sm:inline">Ctrl or Cmd + Enter submits.</span>
                <span className="tabular-nums ml-auto" aria-live="off">
                  {draft.trim() ? draft.trim().split(/\s+/).length : 0} words
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <ErrorNote message={error} />
            </div>
          )}

          {isPending && <PendingPanel seconds={elapsed} />}
          {graded && <GradedPanel graded={graded} />}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 px-6 sm:px-10 py-4 border-t border-line bg-paper-2">
          <Button variant="invisible" size="sm" disabled={index === 0} onClick={() => go(index - 1)} className="-ml-3" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Previous
          </Button>
          <div className="flex flex-wrap gap-2">
            {!graded && (
              <Button variant="primary" onClick={submitAnswer} disabled={isPending || !draft.trim()}>
                {isPending && <Spinner />}
                {isPending ? 'Grading…' : q.type === 'mcq' ? 'Check answer' : 'Submit answer'}
              </Button>
            )}
            {graded && index < qs.length - 1 && (
              <Button
                variant={allAnswered ? 'default' : 'primary'}
                onClick={() => go(firstOpen !== -1 && firstOpen > index ? firstOpen : index + 1)}
                icon={<ArrowRight className="w-4 h-4" />}
                className="flex-row-reverse"
              >
                Next question
              </Button>
            )}
            {allAnswered && (
              <Button variant="primary" onClick={finish} disabled={submitting}>
                {submitting && <Spinner />}
                {submitting ? 'Scoring…' : 'Finish and see my scores'}
              </Button>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function PendingPanel({ seconds }: { seconds: number }) {
  return (
    <div className="mt-6 rounded-[16px] border border-line overflow-hidden" role="status" aria-live="polite">
      <div className="flex items-center gap-3 px-5 py-4 bg-paper-2 border-b border-line">
        <Spinner className="text-ink" />
        <div className="min-w-0">
          <p className="text-[15px] font-medium">Grading your answer</p>
          <p className="text-[13px] text-muted">
            Checking it against the rubric for this question. This can take up to 10 seconds.
          </p>
        </div>
        <span className="ml-auto font-mono text-[13px] text-muted tabular-nums">{seconds}s</span>
      </div>
      <div className="p-5 space-y-2.5" aria-hidden="true">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

function McqOptions({
  qid,
  options,
  value,
  disabled,
  graded,
  onChange,
}: {
  qid: string;
  options: string[];
  value: string;
  disabled: boolean;
  graded?: GradedAnswer;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Choose one answer</legend>
      <div className="grid gap-2">
        {options.map((opt, i) => {
          // Contract: an MCQ answer is the option's index as a string.
          const sel = value === String(i);
          const ok = graded && sel && graded.score >= 50;
          const bad = graded && sel && graded.score < 50;
          return (
            <label
              key={i}
              className={cn(
                'flex items-center gap-3 px-3.5 py-3 rounded-[14px] border text-[15px] leading-snug transition-[border-color,background-color,box-shadow] duration-200',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--orange)] has-[:focus-visible]:outline-offset-2',
                disabled ? 'cursor-default' : 'cursor-pointer hover:border-line-2 hover:bg-paper-2',
                ok
                  ? 'border-[#9BD36A] bg-[#F1FAE7]'
                  : bad
                    ? 'border-[#F5CFCF] bg-[#FDF1F1]'
                    : sel
                      ? 'border-ink bg-sheet shadow-[0_0_0_3px_#CDEB5A]'
                      : 'border-line bg-sheet',
                graded && !sel && 'opacity-60'
              )}
            >
              <input
                type="radio"
                name={`opt-${qid}`}
                value={String(i)}
                checked={sel}
                disabled={disabled}
                onChange={() => onChange(String(i))}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'w-7 h-7 shrink-0 rounded-full border grid place-items-center text-[13px] font-medium',
                  ok
                    ? 'bg-[#3F7F1F] border-[#3F7F1F] text-white'
                    : bad
                      ? 'bg-warn border-warn text-white'
                      : sel
                        ? 'bg-ink border-ink text-paper'
                        : 'bg-paper-2 border-line text-ink-2'
                )}
              >
                {ok ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : bad ? <X className="w-3.5 h-3.5" strokeWidth={3} /> : String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0 flex-1">{opt}</span>
              {ok && <span className="text-[13px] font-medium text-[#3F6212] shrink-0">Correct</span>}
              {bad && <span className="text-[13px] font-medium text-[#B4232C] shrink-0">Not this one</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function GradedPanel({ graded, compact = false }: { graded: GradedAnswer; compact?: boolean }) {
  const t = tone(graded.score);
  const verdict = t === 'pass' ? 'Solid answer.' : t === 'mid' ? 'Partly there.' : 'Missed the main point.';
  const hits = graded.rubric_hits.filter((r) => r.hit).length;
  return (
    <section className={cn('rounded-[16px] border overflow-hidden', compact ? 'border-line' : 'mt-6', !compact && (t === 'pass' ? 'border-[#CFE6AE]' : t === 'mid' ? 'border-[#F1DEAF]' : 'border-[#F5CFCF]'))} aria-live="polite">
      <div
        className={cn(
          'flex items-center justify-between gap-4 px-5 py-4 border-b',
          t === 'pass' ? 'bg-[#F3FAEA] border-[#E1EFCB]' : t === 'mid' ? 'bg-[#FEF8EA] border-[#F4E6C3]' : 'bg-[#FDF4F4] border-[#F5DADA]'
        )}
      >
        <div>
          <h4 className="text-[15px] font-semibold">Feedback</h4>
          <p className={cn('text-[13.5px] font-medium', TONE_TEXT[t])}>
            {verdict}
            {graded.rubric_hits.length > 0 && (
              <span className="text-muted font-normal">
                {' '}
                Covered {hits} of {graded.rubric_hits.length} points.
              </span>
            )}
          </p>
        </div>
        <span className="font-serif text-[44px] leading-none tabular-nums">
          {graded.score}
          <span className="text-[18px] text-muted">/100</span>
        </span>
      </div>
      <div className="p-5 space-y-5 bg-sheet">
        {graded.rubric_hits.length > 0 && (
          <ul className="space-y-1.5" aria-label="What the grader looked for">
            {graded.rubric_hits.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14.5px]">
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-[2px] w-[18px] h-[18px] shrink-0 rounded-full grid place-items-center',
                    r.hit ? 'bg-[#E6F5D0] text-[#3F6212]' : 'bg-[#FDECEC] text-[#B4232C]'
                  )}
                >
                  {r.hit ? <Check className="w-3 h-3" strokeWidth={3} /> : <X className="w-3 h-3" strokeWidth={3} />}
                </span>
                <span className={cn(!r.hit && 'text-muted')}>
                  <span className="sr-only">{r.hit ? 'Covered: ' : 'Missed: '}</span>
                  {r.point}
                </span>
              </li>
            ))}
          </ul>
        )}
        {graded.feedback_md && <Markdown>{graded.feedback_md}</Markdown>}
        {graded.study_tip && (
          <p className="text-[14.5px] rounded-[12px] bg-lime-soft border border-[#DCEBA4] px-4 py-3">
            <span className="font-medium">Study next: </span>
            {graded.study_tip}
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Results */

function QuizResults({
  attempt,
  onBack,
  onRetry,
  retrying,
  onGoToCourse,
  actionError,
}: {
  attempt: QuizAttempt;
  onBack: () => void;
  onRetry: () => void;
  retrying: boolean;
  onGoToCourse: () => void;
  actionError: string | null;
}) {
  const scores = attempt.scores;
  const avg = attempt.average ?? 0;
  const weak = useMemo(
    () => (scores ? ASPECTS.filter((a) => scores[a] < UNLOCK_FLOOR) : []),
    [scores]
  );
  const lowSorted = useMemo(
    () => (scores ? [...ASPECTS].sort((a, b) => scores[a] - scores[b]).slice(0, 2) : []),
    [scores]
  );
  // Results replace the player in place; bring their top into view after submitting.
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
  }, [attempt.id]);

  if (!scores) {
    return (
      <StateCard
        tone="error"
        title="Scores are missing for this attempt."
        body={<p>Go back and open another attempt, or start a new one.</p>}
        action={<Button onClick={onBack}>All attempts</Button>}
      />
    );
  }

  const improve = weak.length > 0 ? weak : lowSorted;
  const avgOk = avg >= UNLOCK_AVERAGE;

  return (
    <div ref={topRef} className="space-y-4 scroll-mt-6">
      {actionError && <ErrorNote message={actionError} />}
      <Button variant="invisible" size="sm" onClick={onBack} className="-ml-3" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
        All attempts
      </Button>

      {attempt.unlocked ? (
        <div className="rounded-m border border-[#B9D84A] bg-lime px-6 py-6 sm:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className="w-11 h-11 shrink-0 rounded-full bg-ink text-lime grid place-items-center">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h3 className="pj-display text-[clamp(28px,3vw,38px)]">Certificate unlocked.</h3>
              <p className="mt-1.5 text-[15px] text-ink-2">Attempt {attempt.attempt_no} met the rule. Anyone with the link can verify it.</p>
            </div>
          </div>
          {attempt.certificate_code && (
            <Link href={`/cert/${attempt.certificate_code}`} className="pj-btn">
              View certificate
            </Link>
          )}
        </div>
      ) : (
        <div className="pj-card px-6 py-6 sm:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex items-start gap-4">
            <span aria-hidden="true" className="w-11 h-11 shrink-0 rounded-full bg-paper-2 border border-line text-ink-2 grid place-items-center">
              <Lock className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="pj-display text-[clamp(28px,3vw,38px)]">
                Not unlocked yet. <em>Here is what to work on.</em>
              </h3>
              <p className="mt-2 text-[15px] text-muted">
                Work on {improve.map((a) => ASPECT_LABELS[a]).join(' and ')}, then try again.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onGoToCourse}>Review the course</Button>
            <Button variant="primary" onClick={onRetry} disabled={retrying}>
              {retrying && <Spinner />}
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* The unlock rule, checked line by line */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Unlock rule">
        <RuleRow ok={avgOk} label={`Average ${UNLOCK_AVERAGE} or more`} value={`Yours: ${avg}`} />
        <RuleRow
          ok={weak.length === 0}
          label={`No skill under ${UNLOCK_FLOOR}`}
          value={weak.length === 0 ? `Lowest: ${lowest(scores).label} ${lowest(scores).value}` : `Under: ${weak.map((a) => ASPECT_LABELS[a]).join(', ')}`}
        />
      </ul>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4 items-start">
        <section className="pj-card p-5 sm:p-6">
          <div className="flex items-baseline justify-between">
            <h4 className="text-[15px] font-semibold">Attempt {attempt.attempt_no}</h4>
            <span className="text-[13px] text-muted">{formatDate(attempt.submitted_at || attempt.created_at)}</span>
          </div>
          <AspectRadar scores={scores} height={290} floor={UNLOCK_FLOOR} />
          <div className="flex items-end justify-between border-t border-line pt-4">
            <div>
              <p className="text-[15px] font-medium">Average</p>
              <p className="text-[13.5px] text-muted">Needs {UNLOCK_AVERAGE} or more</p>
            </div>
            <span className={cn('font-serif text-[56px] leading-none tabular-nums', !avgOk && 'text-ink-2')}>{avg}</span>
          </div>
        </section>

        <section className="pj-card p-5 sm:p-6">
          <h4 className="text-[15px] font-semibold">Skill by skill</h4>
          <p className="text-[13.5px] text-muted mt-1">
            The dashed mark on each bar is the floor of {UNLOCK_FLOOR}. A skill under it blocks the certificate.
          </p>
          <ul className="mt-4">
            {ASPECTS.map((a) => {
              const v = scores[a];
              const low = v < UNLOCK_FLOOR;
              return (
                <li key={a} className="grid grid-cols-[1fr_64px] gap-x-5 py-3 border-b border-line first:border-t">
                  <b className="font-[550] text-[16px]">{ASPECT_LABELS[a]}</b>
                  <span className={cn('row-span-2 col-start-2 self-center text-right font-serif text-[34px] leading-none tabular-nums', low && 'text-[#B4232C]')}>
                    {v}
                  </span>
                  <span className={cn('text-[13.5px]', low ? 'text-[#B4232C]' : 'text-muted')}>
                    {low ? `Under ${UNLOCK_FLOOR}. This blocks the certificate.` : v >= 80 ? 'Strong' : v >= UNLOCK_AVERAGE ? 'Good' : 'Room to grow'}
                  </span>
                  <span className="col-span-2 mt-2.5 relative h-[6px] bg-line rounded-full" aria-hidden="true">
                    <span
                      className={cn('absolute inset-y-0 left-0 rounded-full', low ? 'bg-warn' : v >= UNLOCK_AVERAGE ? 'bg-ink' : 'bg-[#7A766F]')}
                      style={{ width: `${Math.max(0, Math.min(100, v))}%` }}
                    />
                    <span className="absolute -top-[3px] -bottom-[3px] w-0 border-l border-dashed border-ink/60" style={{ left: `${UNLOCK_FLOOR}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <QuestionReview attempt={attempt} />
    </div>
  );
}

function RuleRow({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <li className={cn('flex items-center gap-3 rounded-[14px] border px-4 py-3', ok ? 'border-[#CFE6AE] bg-[#F3FAEA]' : 'border-[#F5CFCF] bg-[#FDF4F4]')}>
      <span
        aria-hidden="true"
        className={cn('w-6 h-6 shrink-0 rounded-full grid place-items-center text-white', ok ? 'bg-[#3F7F1F]' : 'bg-warn')}
      >
        {ok ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <X className="w-3.5 h-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-medium">
          <span className="sr-only">{ok ? 'Met: ' : 'Not met: '}</span>
          {label}
        </span>
        <span className="block text-[13px] text-muted truncate">{value}</span>
      </span>
    </li>
  );
}

function QuestionReview({ attempt }: { attempt: QuizAttempt }) {
  const qs = attempt.questions;
  if (qs.length === 0) return null;
  return (
    <section className="pj-card overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-line">
        <h4 className="text-[15px] font-semibold">Question by question</h4>
        <p className="text-[13.5px] text-muted mt-0.5">Open a question to see your answer and the feedback on it.</p>
      </div>
      <ol className="divide-y divide-line">
        {qs.map((q, i) => {
          const g = attempt.answers[q.id];
          const t = g ? tone(g.score) : null;
          const { Icon, label } = TYPE_META[q.type];
          const answerText = g && q.type === 'mcq' && q.options ? q.options[Number(g.answer)] ?? g.answer : g?.answer;
          return (
            <li key={q.id}>
              <details className="group">
                <summary className="list-none [&::-webkit-details-marker]:hidden flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3.5 cursor-pointer hover:bg-paper-2 transition-colors duration-150">
                  <span className="w-6 shrink-0 text-right font-serif text-[20px] leading-none text-muted tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] leading-snug truncate">{plainPrompt(q.prompt_md)}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted">
                      {ASPECT_LABELS[q.aspect]}
                      <span aria-hidden="true" className="w-[3px] h-[3px] rounded-full bg-line-2" />
                      <span className="inline-flex items-center gap-1">
                        <Icon className="w-3 h-3" aria-hidden="true" />
                        {label}
                      </span>
                    </span>
                  </span>
                  {g && t ? (
                    <span className={cn('shrink-0 inline-flex items-center justify-center min-w-[44px] h-7 px-2 rounded-full border text-[13px] font-medium tabular-nums', TONE_CHIP[t])}>
                      {g.score}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[13px] text-muted">No answer</span>
                  )}
                  <ChevronDown className="w-4 h-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="px-5 sm:px-6 pb-5 pt-1 sm:pl-[64px] space-y-4">
                  <Markdown className="text-[15.5px]">{q.prompt_md}</Markdown>
                  {g && (
                    <>
                      <div className="rounded-[12px] border border-line bg-paper-2 px-4 py-3 text-[14.5px] whitespace-pre-wrap">
                        <span className="block text-[12.5px] text-muted mb-1">Your answer</span>
                        {answerText}
                      </div>
                      <GradedPanel graded={g} compact />
                    </>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
