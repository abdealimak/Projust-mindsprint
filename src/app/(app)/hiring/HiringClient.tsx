'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Play,
  RotateCcw,
  Download,
  Upload,
  ListChecks,
  ToggleLeft,
  PenLine,
  ShieldCheck,
  Search,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ASPECTS, ASPECT_LABELS, type Aspect, type LearningCertificate } from '@/types/learning';

/* ───────────────────────── Types ───────────────────────── */

type QType = 'mcq' | 'true_false' | 'short';

interface Question {
  id: string;
  type: QType;
  prompt: string;
  points: number;
  /** mcq options; true_false uses ['True', 'False'] */
  options: string[];
  /** index into options (mcq / true_false) */
  correct: number;
  /** short answer: any of these words earns credit, proportionally */
  keywords: string[];
}

interface Quiz {
  id: string;
  title: string;
  role: string;
  passMark: number; // percent
  minutes: number; // 0 = no limit
  questions: Question[];
  updatedAt: number;
}

interface Rules {
  overall: number;
  ownership: number;
  aspects: Record<Aspect, number>;
}

/* ───────────────────────── Storage ───────────────────────── */

const QUIZ_KEY = 'projust_hr_quizzes';
const RULES_KEY = 'projust_hr_rules';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the tools still work for this visit.
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);

function blankQuestion(type: QType = 'mcq'): Question {
  return {
    id: uid(),
    type,
    prompt: '',
    points: 1,
    options: type === 'true_false' ? ['True', 'False'] : type === 'mcq' ? ['', '', ''] : [],
    correct: 0,
    keywords: [],
  };
}

function starterQuiz(): Quiz {
  return {
    id: uid(),
    title: 'Backend screening',
    role: 'Backend engineer',
    passMark: 70,
    minutes: 10,
    updatedAt: Date.now(),
    questions: [
      {
        id: uid(),
        type: 'mcq',
        prompt: 'A payment webhook is delivered twice. What stops the customer being charged twice?',
        points: 2,
        options: ['A longer request timeout', 'An idempotency key checked before charging', 'Retrying on the client', 'Logging the request'],
        correct: 1,
        keywords: [],
      },
      {
        id: uid(),
        type: 'true_false',
        prompt: 'Storing passwords with a fast hash like SHA-256 is safe as long as you add a salt.',
        points: 1,
        options: ['True', 'False'],
        correct: 1,
        keywords: [],
      },
      {
        id: uid(),
        type: 'short',
        prompt: 'In a sentence or two, explain why you would put an index on a column.',
        points: 2,
        options: [],
        correct: 0,
        keywords: ['lookup', 'query', 'faster', 'scan', 'where'],
      },
    ],
  };
}

const DEFAULT_RULES: Rules = {
  overall: 70,
  ownership: 50,
  aspects: {
    concept_understanding: 60,
    code_comprehension: 60,
    debugging: 50,
    architecture_design: 50,
    security_best_practices: 50,
    ai_collaboration: 0,
  },
};

const TYPE_META: Record<QType, { label: string; Icon: typeof ListChecks }> = {
  mcq: { label: 'Multiple choice', Icon: ListChecks },
  true_false: { label: 'True / false', Icon: ToggleLeft },
  short: { label: 'Short answer', Icon: PenLine },
};

/* ───────────────────────── Scoring ───────────────────────── */

type Answers = Record<string, number | string | undefined>;

function scoreQuestion(q: Question, a: Answers[string]): number {
  if (q.type === 'short') {
    const text = typeof a === 'string' ? a.toLowerCase() : '';
    if (!text.trim() || q.keywords.length === 0) return 0;
    const hits = q.keywords.filter((k) => k.trim() && text.includes(k.trim().toLowerCase())).length;
    // Half the keywords earns full credit; fewer earns partial.
    const needed = Math.max(1, Math.ceil(q.keywords.length / 2));
    return Math.round(Math.min(1, hits / needed) * q.points * 10) / 10;
  }
  return a === q.correct ? q.points : 0;
}

function problemsOf(quiz: Quiz): string[] {
  const out: string[] = [];
  if (!quiz.title.trim()) out.push('Give the quiz a title.');
  if (quiz.questions.length === 0) out.push('Add at least one question.');
  quiz.questions.forEach((q, i) => {
    const n = `Question ${i + 1}`;
    if (!q.prompt.trim()) out.push(`${n} has no prompt.`);
    if (q.type === 'mcq' && q.options.filter((o) => o.trim()).length < 2) out.push(`${n} needs at least two options.`);
    if (q.type === 'mcq' && !q.options[q.correct]?.trim()) out.push(`${n}: the correct option is empty.`);
    if (q.type === 'short' && q.keywords.length === 0) out.push(`${n} needs keywords to auto-score.`);
  });
  return out;
}

/* ───────────────────────── Root ───────────────────────── */

type Tab = 'builder' | 'preview' | 'screener';

export function HiringClient() {
  const [tab, setTab] = useState<Tab>('builder');
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const stored = load<Quiz[]>(QUIZ_KEY, []);
    const list = stored.length ? stored : [starterQuiz()];
    setQuizzes(list);
    setActiveId(list[0].id);
  }, []);

  useEffect(() => {
    if (quizzes) save(QUIZ_KEY, quizzes);
  }, [quizzes]);

  const active = quizzes?.find((q) => q.id === activeId) ?? quizzes?.[0] ?? null;

  const updateActive = (patch: Partial<Quiz>) =>
    setQuizzes((list) => list?.map((q) => (q.id === active?.id ? { ...q, ...patch, updatedAt: Date.now() } : q)) ?? list);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'builder', label: 'Quiz builder' },
    { id: 'preview', label: 'Candidate preview' },
    { id: 'screener', label: 'Certificate screener' },
  ];

  return (
    <div>
      <div
        role="note"
        className="mb-8 flex items-start gap-3 rounded-2xl border border-line bg-sheet px-4 py-3 text-[14px] text-ink-2"
      >
        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-olive shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">Testing sandbox.</span> Quizzes and screening rules are saved in this browser
          only. Nothing is sent to candidates yet. Use Export to keep a copy.
        </p>
      </div>

      <div className="pj-scroll-x mb-8">
        <div className="pj-segment" role="tablist" aria-label="Hiring tools">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!quizzes || !active ? (
        <div className="pj-card p-6 text-[14px] text-muted">Loading your quizzes…</div>
      ) : tab === 'builder' ? (
        <Builder
          quizzes={quizzes}
          active={active}
          onSelect={setActiveId}
          onChange={updateActive}
          onCreate={() => {
            const q: Quiz = { ...starterQuiz(), title: 'Untitled quiz', role: '', questions: [blankQuestion()] };
            setQuizzes([...quizzes, q]);
            setActiveId(q.id);
          }}
          onImport={(q) => {
            setQuizzes([...quizzes, q]);
            setActiveId(q.id);
          }}
          onDelete={() => {
            const rest = quizzes.filter((q) => q.id !== active.id);
            const next = rest.length ? rest : [starterQuiz()];
            setQuizzes(next);
            setActiveId(next[0].id);
          }}
          onPreview={() => setTab('preview')}
        />
      ) : tab === 'preview' ? (
        <Preview key={active.id + active.updatedAt} quiz={active} onEdit={() => setTab('builder')} />
      ) : (
        <Screener />
      )}
    </div>
  );
}

/* ───────────────────────── Builder ───────────────────────── */

function Builder({
  quizzes,
  active,
  onSelect,
  onChange,
  onCreate,
  onImport,
  onDelete,
  onPreview,
}: {
  quizzes: Quiz[];
  active: Quiz;
  onSelect: (id: string) => void;
  onChange: (patch: Partial<Quiz>) => void;
  onCreate: () => void;
  onImport: (q: Quiz) => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const totalPoints = active.questions.reduce((s, q) => s + q.points, 0);
  const problems = problemsOf(active);

  const setQuestions = (questions: Question[]) => onChange({ questions });
  const updateQ = (id: string, patch: Partial<Question>) =>
    setQuestions(active.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= active.questions.length) return;
    const next = [...active.questions];
    [next[i], next[j]] = [next[j], next[i]];
    setQuestions(next);
  };

  const exportQuiz = () => {
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${active.title.trim().replace(/\s+/g, '-').toLowerCase() || 'quiz'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importQuiz = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Quiz;
      if (!data || typeof data.title !== 'string' || !Array.isArray(data.questions)) throw new Error();
      onImport({ ...data, id: uid(), updatedAt: Date.now(), questions: data.questions.map((q) => ({ ...q, id: uid() })) });
      setImportError(null);
    } catch {
      setImportError('That file is not a quiz exported from this page.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6 lg:gap-8">
      {/* Quiz list */}
      <aside className="space-y-3">
        <h2 className="pj-section-title px-1">Your quizzes</h2>
        <ul className="flex lg:flex-col gap-2 pj-scroll-x" aria-label="Quizzes">
          {quizzes.map((q) => (
            <li key={q.id} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => onSelect(q.id)}
                aria-current={q.id === active.id ? 'true' : undefined}
                className={cn(
                  'w-full text-left rounded-2xl border px-4 py-3 transition-colors',
                  q.id === active.id ? 'border-ink bg-sheet' : 'border-line bg-paper hover:bg-sheet'
                )}
              >
                <div className="text-[14px] font-semibold truncate max-w-[200px]">{q.title || 'Untitled quiz'}</div>
                <div className="text-[12.5px] text-muted">
                  {q.questions.length} question{q.questions.length === 1 ? '' : 's'}
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onCreate} className="pj-btn pj-btn-ghost pj-btn-sm">
            <Plus className="w-4 h-4" aria-hidden /> New quiz
          </button>
          <label className="pj-btn pj-btn-ghost pj-btn-sm cursor-pointer">
            <Upload className="w-4 h-4" aria-hidden /> Import
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importQuiz(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {importError && <p className="text-[13px] text-warn px-1">{importError}</p>}
      </aside>

      {/* Editor */}
      <div className="min-w-0 space-y-5">
        <section className="pj-card p-5 sm:p-6" aria-labelledby="quiz-settings">
          <h2 id="quiz-settings" className="pj-section-title">
            Quiz settings
          </h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Title">
              <input className="pj-input" value={active.title} onChange={(e) => onChange({ title: e.target.value })} />
            </Field>
            <Field label="Role">
              <input
                className="pj-input"
                placeholder="e.g. Frontend engineer"
                value={active.role}
                onChange={(e) => onChange({ role: e.target.value })}
              />
            </Field>
            <Field label={`Pass mark: ${active.passMark}%`}>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={active.passMark}
                onChange={(e) => onChange({ passMark: Number(e.target.value) })}
                className="w-full accent-[var(--olive)] h-11"
              />
            </Field>
            <Field label="Time limit (minutes, 0 for none)">
              <input
                type="number"
                min={0}
                max={180}
                className="pj-input"
                value={active.minutes}
                onChange={(e) => onChange({ minutes: Math.max(0, Math.min(180, Number(e.target.value) || 0)) })}
              />
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="button" onClick={onPreview} className="pj-btn pj-btn-olive pj-btn-sm">
              <Play className="w-4 h-4" aria-hidden /> Try as candidate
            </button>
            <button type="button" onClick={exportQuiz} className="pj-btn pj-btn-ghost pj-btn-sm">
              <Download className="w-4 h-4" aria-hidden /> Export
            </button>
            {confirmDelete ? (
              <span className="inline-flex items-center gap-2 text-[13.5px]">
                Delete “{active.title || 'Untitled quiz'}”?
                <button type="button" onClick={onDelete} className="pj-btn pj-btn-sm bg-warn border-warn">
                  Delete quiz
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="pj-btn pj-btn-ghost pj-btn-sm">
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="pj-btn pj-btn-ghost pj-btn-sm text-warn"
              >
                <Trash2 className="w-4 h-4" aria-hidden /> Delete
              </button>
            )}
            <span className="ml-auto text-[13px] text-muted">
              {active.questions.length} questions · {totalPoints} points
            </span>
          </div>
        </section>

        {problems.length > 0 && (
          <div className="rounded-2xl border border-[#F1DEAF] bg-[#FDF3DC] px-4 py-3 text-[13.5px] text-[#5C3D08]">
            <p className="font-semibold">Fix before sharing</p>
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              {problems.slice(0, 5).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <ol className="space-y-4" aria-label="Questions">
          {active.questions.map((q, i) => (
            <QuestionEditor
              key={q.id}
              index={i}
              count={active.questions.length}
              q={q}
              onChange={(patch) => updateQ(q.id, patch)}
              onMove={(dir) => move(i, dir)}
              onDuplicate={() => {
                const next = [...active.questions];
                next.splice(i + 1, 0, { ...q, id: uid() });
                setQuestions(next);
              }}
              onRemove={() => setQuestions(active.questions.filter((x) => x.id !== q.id))}
            />
          ))}
        </ol>

        <div className="pj-card border-dashed p-4 flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] text-muted mr-1">Add a question:</span>
          {(Object.keys(TYPE_META) as QType[]).map((t) => {
            const { label, Icon } = TYPE_META[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setQuestions([...active.questions, blankQuestion(t)])}
                className="pj-btn pj-btn-ghost pj-btn-sm"
              >
                <Icon className="w-4 h-4" aria-hidden /> {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-[13px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'w-9 h-9 grid place-items-center rounded-full text-muted hover:bg-sheet transition-colors disabled:opacity-30 disabled:pointer-events-none',
        danger ? 'hover:text-warn' : 'hover:text-ink'
      )}
    >
      {children}
    </button>
  );
}

function QuestionEditor({
  q,
  index,
  count,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  q: Question;
  index: number;
  count: number;
  onChange: (patch: Partial<Question>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { label, Icon } = TYPE_META[q.type];
  const [keywordDraft, setKeywordDraft] = useState('');

  const addKeyword = () => {
    const words = keywordDraft
      .split(',')
      .map((w) => w.trim())
      .filter((w) => w && !q.keywords.includes(w));
    if (words.length) onChange({ keywords: [...q.keywords, ...words] });
    setKeywordDraft('');
  };

  return (
    <li className="pj-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-paper border border-line grid place-items-center font-mono text-[12px] text-ink-2 shrink-0">
          {index + 1}
        </span>
        <span className="pj-chip">
          <Icon className="w-3.5 h-3.5" aria-hidden /> {label}
        </span>
        <div className="ml-auto flex items-center">
          <IconBtn label="Move up" onClick={() => onMove(-1)} disabled={index === 0}>
            <ArrowUp className="w-4 h-4" />
          </IconBtn>
          <IconBtn label="Move down" onClick={() => onMove(1)} disabled={index === count - 1}>
            <ArrowDown className="w-4 h-4" />
          </IconBtn>
          <IconBtn label="Duplicate question" onClick={onDuplicate}>
            <Copy className="w-4 h-4" />
          </IconBtn>
          <IconBtn label="Remove question" onClick={onRemove} danger>
            <Trash2 className="w-4 h-4" />
          </IconBtn>
        </div>
      </div>

      <label className="block mt-4">
        <span className="sr-only">Question {index + 1} prompt</span>
        <textarea
          value={q.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="Write the question"
          rows={2}
          className="w-full rounded-2xl border border-line-2 bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-ink resize-y"
        />
      </label>

      {(q.type === 'mcq' || q.type === 'true_false') && (
        <fieldset className="mt-3">
          <legend className="text-[13px] text-muted mb-2">Options · select the correct one</legend>
          <ul className="space-y-2">
            {q.options.map((opt, oi) => (
              <li key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correct === oi}
                  onChange={() => onChange({ correct: oi })}
                  aria-label={`Mark option ${oi + 1} correct`}
                  className="w-4 h-4 accent-[var(--olive)] shrink-0"
                />
                {q.type === 'true_false' ? (
                  <span className="text-[15px]">{opt}</span>
                ) : (
                  <>
                    <input
                      className="pj-input h-10"
                      value={opt}
                      placeholder={`Option ${oi + 1}`}
                      onChange={(e) => {
                        const options = [...q.options];
                        options[oi] = e.target.value;
                        onChange({ options });
                      }}
                    />
                    <IconBtn
                      label={`Remove option ${oi + 1}`}
                      disabled={q.options.length <= 2}
                      danger
                      onClick={() => {
                        const options = q.options.filter((_, k) => k !== oi);
                        const correct = q.correct === oi ? 0 : q.correct > oi ? q.correct - 1 : q.correct;
                        onChange({ options, correct });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </IconBtn>
                  </>
                )}
              </li>
            ))}
          </ul>
          {q.type === 'mcq' && q.options.length < 6 && (
            <button
              type="button"
              onClick={() => onChange({ options: [...q.options, ''] })}
              className="mt-2 text-[13.5px] font-medium text-olive hover:underline"
            >
              + Add option
            </button>
          )}
        </fieldset>
      )}

      {q.type === 'short' && (
        <div className="mt-3">
          <p className="text-[13px] text-muted mb-2">
            Scoring keywords. Mentioning half of them earns full points; fewer earns partial points.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {q.keywords.map((k) => (
              <span key={k} className="pj-chip">
                {k}
                <button
                  type="button"
                  aria-label={`Remove keyword ${k}`}
                  onClick={() => onChange({ keywords: q.keywords.filter((x) => x !== k) })}
                  className="text-muted hover:text-warn"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="pj-input h-10"
              placeholder="Type keywords, separated by commas"
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addKeyword();
                }
              }}
            />
            <button type="button" onClick={addKeyword} className="pj-btn pj-btn-ghost pj-btn-sm shrink-0">
              Add
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-[13.5px]">
        <label htmlFor={`pts-${q.id}`} className="text-muted">
          Points
        </label>
        <input
          id={`pts-${q.id}`}
          type="number"
          min={1}
          max={10}
          value={q.points}
          onChange={(e) => onChange({ points: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
          className="pj-input h-9 w-20 px-3 text-[14px]"
        />
      </div>
    </li>
  );
}

/* ───────────────────────── Candidate preview ───────────────────────── */

function Preview({ quiz, onEdit }: { quiz: Quiz; onEdit: () => void }) {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(quiz.minutes * 60);
  const problems = problemsOf(quiz);

  useEffect(() => {
    if (!started || submitted || quiz.minutes === 0) return;
    if (secondsLeft <= 0) {
      setSubmitted(true);
      return;
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [started, submitted, secondsLeft, quiz.minutes]);

  const total = quiz.questions.reduce((s, q) => s + q.points, 0);
  const earned = useMemo(
    () => quiz.questions.reduce((s, q) => s + scoreQuestion(q, answers[q.id]), 0),
    [quiz.questions, answers]
  );
  const pct = total ? Math.round((earned / total) * 100) : 0;
  const passed = pct >= quiz.passMark;
  const answered = quiz.questions.filter((q) => {
    const a = answers[q.id];
    return typeof a === 'string' ? a.trim() !== '' : a !== undefined;
  }).length;

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    setStarted(false);
    setSecondsLeft(quiz.minutes * 60);
  };

  if (!started) {
    return (
      <div className="pj-card p-6 sm:p-8 max-w-[720px]">
        <span className="pj-eyebrow">{quiz.role || 'Screening quiz'}</span>
        <h2 className="mt-3 pj-display text-[34px]">{quiz.title || 'Untitled quiz'}</h2>
        <ul className="mt-4 flex flex-wrap gap-2 text-[13.5px]">
          <li className="pj-chip">{quiz.questions.length} questions</li>
          <li className="pj-chip">{total} points</li>
          <li className="pj-chip">Pass at {quiz.passMark}%</li>
          <li className="pj-chip">
            <Clock className="w-3.5 h-3.5" aria-hidden /> {quiz.minutes ? `${quiz.minutes} min` : 'No time limit'}
          </li>
        </ul>
        <p className="mt-4 text-[14.5px] text-muted leading-relaxed">
          This is exactly what a candidate will see. Your answers here are not saved.
        </p>
        {problems.length > 0 && (
          <p className="mt-4 text-[13.5px] text-[#8A5A0B]">
            {problems.length} thing{problems.length === 1 ? '' : 's'} to fix in the builder first. You can still try it.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="pj-btn"
            disabled={quiz.questions.length === 0}
            onClick={() => setStarted(true)}
          >
            <Play className="w-4 h-4" aria-hidden /> Start quiz
          </button>
          <button type="button" className="pj-btn pj-btn-ghost" onClick={onEdit}>
            Edit quiz
          </button>
        </div>
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="max-w-[760px]">
      <div className="sticky top-3 z-10 mb-5 flex items-center justify-between gap-3 rounded-full border border-line bg-paper shadow-sm px-4 py-2 text-[13.5px]">
        <span className="font-semibold truncate">{quiz.title}</span>
        <span className="flex items-center gap-3 shrink-0 text-muted">
          <span>
            {answered}/{quiz.questions.length} answered
          </span>
          {quiz.minutes > 0 && !submitted && (
            <span className={cn('font-mono', secondsLeft < 60 && 'text-warn')} aria-live="off">
              {mm}:{ss}
            </span>
          )}
        </span>
      </div>

      {submitted && (
        <section
          aria-live="polite"
          className={cn(
            'mb-6 rounded-[20px] border p-5 sm:p-6',
            passed ? 'border-[#CFE6AE] bg-[#E6F5D0] text-[#2F4A0E]' : 'border-[#F5CFCF] bg-[#FDECEC] text-[#7F1D1D]'
          )}
        >
          <p className="font-mono text-[12px] tracking-[.12em] uppercase">{passed ? 'Passed' : 'Did not pass'}</p>
          <p className="mt-1 pj-display text-[44px]">{pct}%</p>
          <p className="text-[14px]">
            {earned} of {total} points · pass mark {quiz.passMark}%
            {quiz.minutes > 0 && secondsLeft <= 0 && ' · time ran out'}
          </p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={reset} className="pj-btn pj-btn-ghost pj-btn-sm">
              <RotateCcw className="w-4 h-4" aria-hidden /> Try again
            </button>
            <button type="button" onClick={onEdit} className="pj-btn pj-btn-ghost pj-btn-sm">
              Edit quiz
            </button>
          </div>
        </section>
      )}

      <ol className="space-y-4">
        {quiz.questions.map((q, i) => {
          const a = answers[q.id];
          const got = scoreQuestion(q, a);
          return (
            <li key={q.id} className="pj-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[15.5px] font-medium leading-relaxed">
                  <span className="text-muted mr-2 font-mono text-[13px]">{i + 1}.</span>
                  {q.prompt || <span className="text-muted italic">No prompt yet</span>}
                </p>
                <span className="text-[12.5px] text-muted shrink-0">
                  {submitted ? `${got}/${q.points}` : `${q.points} pt${q.points === 1 ? '' : 's'}`}
                </span>
              </div>

              {q.type === 'short' ? (
                <textarea
                  rows={3}
                  disabled={submitted}
                  value={(a as string) ?? ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  aria-label={`Answer to question ${i + 1}`}
                  placeholder="Your answer"
                  className="mt-3 w-full rounded-2xl border border-line-2 bg-white px-4 py-3 text-[15px] focus:outline-none focus:border-ink disabled:bg-sheet"
                />
              ) : (
                <ul className="mt-3 space-y-2" role="radiogroup" aria-label={`Question ${i + 1} options`}>
                  {q.options.map((opt, oi) => {
                    if (!opt.trim()) return null;
                    const chosen = a === oi;
                    const isRight = submitted && oi === q.correct;
                    const isWrong = submitted && chosen && oi !== q.correct;
                    return (
                      <li key={oi}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={chosen}
                          disabled={submitted}
                          onClick={() => setAnswers({ ...answers, [q.id]: oi })}
                          className={cn(
                            'w-full flex items-center gap-3 text-left rounded-2xl border px-4 py-3 text-[14.5px] transition-colors',
                            isRight
                              ? 'border-[#CFE6AE] bg-[#E6F5D0]'
                              : isWrong
                                ? 'border-[#F5CFCF] bg-[#FDECEC]'
                                : chosen
                                  ? 'border-ink bg-sheet'
                                  : 'border-line hover:bg-sheet'
                          )}
                        >
                          <span
                            className={cn(
                              'w-5 h-5 rounded-full border grid place-items-center shrink-0',
                              chosen ? 'border-ink bg-ink text-paper' : 'border-line-2'
                            )}
                          >
                            {chosen && <Check className="w-3 h-3" />}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {isRight && <Check className="w-4 h-4 text-[#3F6212]" aria-label="Correct answer" />}
                          {isWrong && <X className="w-4 h-4 text-[#B4232C]" aria-label="Wrong answer" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {submitted && q.type === 'short' && (
                <p className="mt-2 text-[13px] text-muted">
                  Looked for: {q.keywords.join(', ') || 'no keywords set'}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {!submitted && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="pj-btn" onClick={() => setSubmitted(true)}>
            Submit answers
          </button>
          {answered < quiz.questions.length && (
            <span className="text-[13.5px] text-muted">
              {quiz.questions.length - answered} unanswered will score zero.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Certificate screener ───────────────────────── */

function Screener() {
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cert, setCert] = useState<LearningCertificate | null>(null);

  useEffect(() => setRules(load(RULES_KEY, DEFAULT_RULES)), []);
  const updateRules = (next: Rules) => {
    setRules(next);
    save(RULES_KEY, next);
  };

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().split('/').pop()?.toUpperCase();
    if (!c) return;
    setLoading(true);
    setError(null);
    setCert(null);
    try {
      const res = await fetch(`/api/certificates/${encodeURIComponent(c)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not check that certificate.');
      setCert(data.certificate as LearningCertificate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check that certificate.');
    } finally {
      setLoading(false);
    }
  };

  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const rows = cert
    ? [
        { label: 'Overall', value: num(cert.overall), min: rules.overall },
        // Ownership is not measured on every certificate; skip it rather than fail the candidate.
        ...(typeof cert.ownership_pct === 'number'
          ? [{ label: 'Code ownership', value: cert.ownership_pct, min: rules.ownership }]
          : []),
        ...ASPECTS.map((a) => ({ label: ASPECT_LABELS[a], value: num(cert.scores?.[a]), min: rules.aspects[a] })),
      ]
    : [];
  const failing = rows.filter((r) => r.value < r.min);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 lg:gap-8">
      <section className="pj-card p-5 sm:p-6" aria-labelledby="rules-heading">
        <h2 id="rules-heading" className="pj-section-title">
          Score bar for this role
        </h2>
        <p className="mt-1 text-[13.5px] text-muted">Set the minimum score a certificate needs. 0 means not required.</p>
        <div className="mt-5 space-y-4">
          <Slider label="Overall" value={rules.overall} onChange={(v) => updateRules({ ...rules, overall: v })} />
          <Slider
            label="Code ownership"
            value={rules.ownership}
            onChange={(v) => updateRules({ ...rules, ownership: v })}
          />
          <hr className="border-line" />
          {ASPECTS.map((a) => (
            <Slider
              key={a}
              label={ASPECT_LABELS[a]}
              value={rules.aspects[a]}
              onChange={(v) => updateRules({ ...rules, aspects: { ...rules.aspects, [a]: v } })}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => updateRules(DEFAULT_RULES)}
          className="mt-5 text-[13.5px] font-medium text-muted hover:text-ink"
        >
          Reset to defaults
        </button>
      </section>

      <section className="space-y-5" aria-labelledby="check-heading">
        <div className="pj-card p-5 sm:p-6">
          <h2 id="check-heading" className="pj-section-title">
            Check a candidate
          </h2>
          <p className="mt-1 text-[13.5px] text-muted">Paste a certificate ID or link from a candidate.</p>
          <form onSubmit={check} className="mt-4 flex flex-col sm:flex-row gap-2">
            <label className="sr-only" htmlFor="cert-code">
              Certificate ID or link
            </label>
            <input
              id="cert-code"
              className="pj-input"
              placeholder="e.g. PJ-7K2M-9QXA"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button type="submit" className="pj-btn shrink-0" disabled={loading || !code.trim()}>
              <Search className="w-4 h-4" aria-hidden /> {loading ? 'Checking…' : 'Check certificate'}
            </button>
          </form>
          {error && <p className="mt-3 text-[13.5px] text-warn">{error}</p>}
        </div>

        {cert && (
          <div className="pj-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] text-muted flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-olive" aria-hidden /> Issued by Projust · {cert.level}
                  {cert.sample && <span className="pj-chip ml-1 py-0.5">Sample</span>}
                </p>
                <h3 className="mt-1 text-[18px] font-semibold truncate">{cert.recipient_name}</h3>
                <p className="text-[13.5px] text-muted truncate">
                  {cert.repo_full_name} · {new Date(cert.issued_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 text-[12.5px] font-semibold px-3 py-1 rounded-full border',
                  failing.length === 0
                    ? 'bg-[#E6F5D0] border-[#CFE6AE] text-[#3F6212]'
                    : 'bg-[#FDECEC] border-[#F5CFCF] text-[#B4232C]'
                )}
              >
                {failing.length === 0 ? 'Meets the bar' : `${failing.length} below the bar`}
              </span>
            </div>
            <ul className="mt-5 space-y-2.5">
              {rows.map((r) => {
                const ok = r.value >= r.min;
                return (
                  <li key={r.label} className="grid grid-cols-[110px_minmax(0,1fr)_72px] items-center gap-3 text-[13.5px]">
                    <span className="text-ink-2 truncate">{r.label}</span>
                    <span className="relative h-2 rounded-full bg-sheet border border-line overflow-hidden">
                      <span
                        className={cn('absolute inset-y-0 left-0 rounded-full', ok ? 'bg-olive' : 'bg-warn')}
                        style={{ width: `${Math.min(100, r.value)}%` }}
                      />
                      {r.min > 0 && (
                        <span className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${r.min}%` }} aria-hidden />
                      )}
                    </span>
                    <span className={cn('text-right font-mono', ok ? 'text-ink' : 'text-warn')}>
                      {Math.round(r.value)}
                      {r.min > 0 && <span className="text-muted">/{r.min}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <a
              href={`/cert/${encodeURIComponent(cert.code)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex pj-btn pj-btn-ghost pj-btn-sm"
            >
              Open full certificate
            </a>
          </div>
        )}
      </section>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="grid grid-cols-[120px_minmax(0,1fr)_40px] items-center gap-3 text-[13.5px]">
      <span className="text-ink-2">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--olive)]"
      />
      <span className="text-right font-mono">{value}</span>
    </label>
  );
}
