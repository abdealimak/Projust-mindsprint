'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, X, ArrowLeft } from 'lucide-react';
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
import { api, ApiError, usePoll, Markdown, CodeBlock, StateCard, ErrorNote, Spinner } from './shared';
import { loadErrorText } from './shared';

const TYPE_LABEL: Record<PublicQuestion['type'], string> = {
  mcq: 'Pick one',
  free_text: 'Explain',
  find_the_bug: 'Find the bug',
  what_if: 'What if',
};

interface Props {
  projectId: string;
  conceptsReady: boolean;
  onGoToConcepts: () => void;
  onGoToCourse: () => void;
  onChanged?: () => void;
}

type View = { kind: 'home' } | { kind: 'play'; attemptId: string } | { kind: 'results'; attemptId: string };

export function QuizTab({ projectId, conceptsReady, onGoToConcepts, onGoToCourse, onChanged }: Props) {
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
          title={`Writing attempt ${current.attempt_no}.`}
          body={
            <p className="inline-flex items-center gap-2.5" role="status">
              <Spinner />
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
      <div className="pj-card p-6 sm:p-10 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-6 items-end">
        <div>
          <h3 className="pj-display text-[clamp(30px,3.2vw,42px)]">
            Six skills, <em>scored on your code.</em>
          </h3>
          <p className="mt-4 text-[15.5px] text-muted max-w-[56ch]">
            Each attempt asks about your own repository. Answers are graded one by one with feedback. The
            certificate unlocks with an average of {UNLOCK_AVERAGE} or more and no skill under {UNLOCK_FLOOR}.
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
                  className="w-full text-left grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 hover:bg-paper-2 transition-colors duration-200 cursor-pointer"
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
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const q = qs[index];
  const graded = q ? answered[q.id] : undefined;
  const answeredCount = qs.filter((x) => answered[x.id]).length;
  const allAnswered = qs.length > 0 && answeredCount === qs.length;
  const draft = q ? drafts[q.id] ?? '' : '';

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

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="invisible" size="sm" onClick={onBack} className="-ml-3" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
          All attempts
        </Button>
        <p className="text-[13.5px] text-muted">
          Attempt {attempt.attempt_no}. {answeredCount} of {qs.length} answered
        </p>
      </div>
      <nav aria-label="Questions" className="flex flex-wrap gap-1.5">
        {qs.map((x, i) => {
          const g = answered[x.id];
          const reachable = !!g || i === firstOpen || i <= (firstOpen === -1 ? qs.length : firstOpen);
          return (
            <button
              key={x.id}
              type="button"
              disabled={!reachable}
              onClick={() => go(i)}
              aria-current={i === index ? 'step' : undefined}
              aria-label={`Question ${i + 1}${g ? `, scored ${g.score}` : ''}`}
              className={cn(
                'h-8 min-w-8 px-2 rounded-full border text-[13px] tabular-nums transition-colors duration-200',
                'disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
                i === index ? 'bg-ink text-paper border-ink' : g ? 'bg-sheet border-line-2 text-ink' : 'bg-sheet border-line text-muted'
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </nav>

      <div className="h-[3px] bg-line rounded-full overflow-hidden" aria-hidden="true">
        <div className="h-full bg-ink rounded-full transition-[width] duration-300 ease-land" style={{ width: `${(answeredCount / qs.length) * 100}%` }} />
      </div>

      <article className="pj-card p-6 sm:p-10" aria-labelledby={`q-${q.id}`}>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="px-2.5 py-0.5 rounded-full border border-line bg-paper-2 text-ink-2">{ASPECT_LABELS[q.aspect]}</span>
          <span className="text-muted">{TYPE_LABEL[q.type]}</span>
          <span className="ml-auto text-muted tabular-nums">
            {index + 1} of {qs.length}
          </span>
        </div>
        <h3 id={`q-${q.id}`} ref={headingRef} tabIndex={-1} className="sr-only">
          Question {index + 1}
        </h3>
        <Markdown className="mt-5 text-[17px] leading-[1.6] max-w-[68ch]">{q.prompt_md}</Markdown>

        {q.code && (
          <div className="mt-5">
            <CodeBlock snippet={q.code.snippet} startLine={q.code.startLine} path={`${q.code.path}:${q.code.startLine}-${q.code.endLine}`} />
          </div>
        )}

        <div className="mt-6">
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
            <div className="rounded-[12px] border border-line bg-paper-2 p-4 text-[15px] whitespace-pre-wrap">
              <span className="block text-[12.5px] text-muted mb-1">Your answer</span>
              {graded.answer}
            </div>
          ) : (
            <div>
              <label htmlFor={`a-${q.id}`} className="block text-[13.5px] font-medium mb-2">
                Your answer
              </label>
              <textarea
                id={`a-${q.id}`}
                rows={5}
                value={draft}
                disabled={isPending}
                onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                placeholder={
                  q.type === 'find_the_bug'
                    ? 'Say which line is wrong, why, and how you would fix it.'
                    : q.type === 'what_if'
                      ? 'Describe what would happen and why.'
                      : 'Explain in your own words.'
                }
                className="w-full min-h-[96px] rounded-[12px] border border-line bg-sheet px-4 py-3 text-[15px] leading-[1.55] resize-y placeholder:text-[#A8A39A] focus:outline-none focus:border-ink transition-colors duration-200 disabled:bg-paper-2"
              />
              <div className="mt-1.5 text-right text-[12px] text-muted tabular-nums" aria-live="off">
                {draft.length} characters
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4">
            <ErrorNote message={error} />
          </div>
        )}

        {isPending && (
          <div className="mt-6 flex items-center gap-3 rounded-[12px] border border-line bg-paper-2 px-4 py-4 text-[14.5px] text-ink-2" role="status">
            <Spinner />
            Grading your answer. This can take up to 10 seconds.
          </div>
        )}

        {graded && <GradedPanel graded={graded} />}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button variant="invisible" size="sm" disabled={index === 0} onClick={() => go(index - 1)} className="-ml-3">
            Previous
          </Button>
          <div className="flex flex-wrap gap-2">
            {!graded && (
              <Button variant="primary" onClick={submitAnswer} disabled={isPending || !draft.trim()}>
                {isPending ? 'Grading…' : 'Submit answer'}
              </Button>
            )}
            {graded && index < qs.length - 1 && (
              <Button variant={allAnswered ? 'default' : 'primary'} onClick={() => go(firstOpen !== -1 && firstOpen > index ? firstOpen : index + 1)}>
                Next question
              </Button>
            )}
            {allAnswered && (
              <Button variant="primary" onClick={finish} disabled={submitting}>
                {submitting && <Spinner />}
                {submitting ? 'Scoring…' : 'Finish and score'}
              </Button>
            )}
          </div>
        </div>
      </article>
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
                'flex items-center justify-between gap-3 px-4 py-3 rounded-[12px] border text-[14.5px] transition-colors duration-200',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--orange)] has-[:focus-visible]:outline-offset-2',
                disabled ? 'cursor-default' : 'cursor-pointer hover:border-line-2',
                ok ? 'border-[#9BD36A] bg-[#F1FAE7]' : bad ? 'border-[#F5CFCF] bg-[#FDF1F1]' : sel ? 'border-ink bg-paper-2' : 'border-line bg-sheet'
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
              <span className="min-w-0">{opt}</span>
              <span
                aria-hidden="true"
                className={cn(
                  'w-5 h-5 shrink-0 rounded-full border-[1.5px] grid place-items-center',
                  ok ? 'bg-[#5FA831] border-[#5FA831] text-white' : bad ? 'bg-warn border-warn text-white' : sel ? 'border-ink bg-ink text-paper' : 'border-line-2'
                )}
              >
                {ok ? <Check className="w-3 h-3" strokeWidth={3} /> : bad ? <X className="w-3 h-3" strokeWidth={3} /> : sel ? <span className="w-1.5 h-1.5 rounded-full bg-paper" /> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function GradedPanel({ graded }: { graded: GradedAnswer }) {
  const pass = graded.score >= UNLOCK_AVERAGE;
  return (
    <section className="mt-6 rounded-[16px] border border-line overflow-hidden" aria-live="polite">
      <div className="flex items-center justify-between gap-4 px-5 py-4 bg-paper-2 border-b border-line">
        <div>
          <h4 className="text-[15px] font-semibold">Feedback</h4>
          <p className={cn('text-[13px]', pass ? 'text-[#3F6212]' : 'text-muted')}>
            {pass ? 'Solid answer.' : graded.score >= UNLOCK_FLOOR ? 'Partly there.' : 'Missed the main point.'}
          </p>
        </div>
        <span className="font-serif text-[44px] leading-none tabular-nums">
          {graded.score}
          <span className="text-[18px] text-muted">/100</span>
        </span>
      </div>
      <div className="p-5 space-y-5">
        {graded.rubric_hits.length > 0 && (
          <ul className="space-y-1.5">
            {graded.rubric_hits.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14.5px]">
                <span
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
          <p className="text-[14.5px] rounded-[12px] bg-paper px-4 py-3">
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

  return (
    <div className="space-y-4">
      {actionError && <ErrorNote message={actionError} />}
      <Button variant="invisible" size="sm" onClick={onBack} className="-ml-3" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
        All attempts
      </Button>

      {attempt.unlocked ? (
        <div className="rounded-m border border-[#B9D84A] bg-lime px-6 py-6 sm:px-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="pj-display text-[clamp(28px,3vw,38px)]">Certificate unlocked.</h3>
            <p className="mt-1.5 text-[15px] text-ink-2">Attempt {attempt.attempt_no} met the rule. Anyone with the link can verify it.</p>
          </div>
          {attempt.certificate_code && (
            <Link href={`/cert/${attempt.certificate_code}`} className="pj-btn">
              View certificate
            </Link>
          )}
        </div>
      ) : (
        <div className="pj-card px-6 py-6 sm:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="pj-display text-[clamp(28px,3vw,38px)]">
              Not unlocked yet. <em>Here is what to work on.</em>
            </h3>
            <p className="mt-2 text-[15px] text-muted">
              Work on {improve.map((a) => ASPECT_LABELS[a]).join(' and ')}, then try again.
            </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 items-start">
        <section className="pj-card p-5 sm:p-6">
          <div className="flex items-baseline justify-between">
            <h4 className="text-[15px] font-semibold">Attempt {attempt.attempt_no}</h4>
            <span className="text-[13px] text-muted">{formatDate(attempt.submitted_at || attempt.created_at)}</span>
          </div>
          <AspectRadar scores={scores} height={280} />
          <div className="flex items-end justify-between border-t border-line pt-4">
            <div>
              <p className="text-[15px] font-medium">Average</p>
              <p className="text-[13.5px] text-muted">Needs {UNLOCK_AVERAGE} or more</p>
            </div>
            <span className="font-serif text-[56px] leading-none tabular-nums">{avg}</span>
          </div>
        </section>

        <section className="pj-card p-5 sm:p-6">
          <h4 className="text-[15px] font-semibold">Skill by skill</h4>
          <p className="text-[13.5px] text-muted mt-1">
            To unlock: average {UNLOCK_AVERAGE} or more and no skill under {UNLOCK_FLOOR}.
          </p>
          <ul className="mt-4">
            {ASPECTS.map((a) => {
              const v = scores[a];
              const low = v < UNLOCK_FLOOR;
              return (
                <li key={a} className="grid grid-cols-[1fr_64px] gap-x-5 py-3 border-b border-line first:border-t">
                  <b className="font-[550] text-[16px]">{ASPECT_LABELS[a]}</b>
                  <span className="row-span-2 col-start-2 self-center text-right font-serif text-[34px] leading-none tabular-nums">{v}</span>
                  <span className={cn('text-[13.5px]', low ? 'text-[#B4232C]' : 'text-muted')}>
                    {low ? `Under ${UNLOCK_FLOOR}. This blocks the certificate.` : v >= 80 ? 'Strong' : v >= UNLOCK_AVERAGE ? 'Good' : 'Room to grow'}
                  </span>
                  <span className="col-span-2 mt-2 h-[3px] bg-line rounded-full overflow-hidden">
                    <span
                      className={cn('block h-full rounded-full', low ? 'bg-warn' : 'bg-ink')}
                      style={{ width: `${Math.max(0, Math.min(100, v))}%` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
