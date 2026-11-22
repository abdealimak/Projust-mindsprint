import { withUsage } from '@/lib/ai/usage';
import { createClient } from '@/lib/supabase/server';
import type {
  AspectScores,
  Concept,
  ConceptsResponse,
  Course,
  GenStatus,
  GradedAnswer,
  LearningCertificate,
  LearningSummary,
  QuizAttempt,
} from '@/types/learning';
import { generateConcepts } from './concepts';
import { generateCourse, type Level } from './course';
import { generateQuiz, gradeAnswer, toPublic, type StoredQuestion } from './quiz';
import { aspectScores, average, isUnlocked, newCertificateCode, strengthFor } from './score';
import { isLlmConfigured } from '@/lib/ai/provider';
import { activeAI } from '@/lib/ai/user-settings';
import { runAfterResponse } from '@/lib/server/background';

/** Jobs run in-process. If the server restarted mid-job, a "generating" row older than this is failed. */
const STALE_MS = 15 * 60 * 1000;
const isStale = (iso: string | null | undefined) => !iso || Date.now() - new Date(iso).getTime() > STALE_MS;

export class BrainError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function runInBackground(name: string, job: () => Promise<void>) {
  runAfterResponse(`brain:${name}`, job);
}

function requireLlm() {
  const ai = activeAI();
  if (ai.user) return; // the user's own key from Settings → AI
  if (!ai.allowServer || !isLlmConfigured) {
    throw new BrainError('No AI is set up for your account yet. Add your API key in Settings → AI, then try again.', 503);
  }
}

// ── Concepts ────────────────────────────────────────────────────────────────
export async function getConcepts(projectId: string): Promise<ConceptsResponse> {
  const supabase = createClient();
  const { data: p } = await supabase
    .from('projects')
    .select('concepts_status, concepts_detail, concepts_progress, updated_at')
    .eq('id', projectId)
    .single();
  let status = (p?.concepts_status || 'none') as GenStatus;
  let detail = p?.concepts_detail ?? null;
  if (status === 'generating' && isStale(p?.updated_at)) {
    status = 'failed';
    detail = 'Concept mapping stopped unexpectedly. Try again.';
  }
  let concepts: Concept[] = [];
  if (status === 'ready') {
    const { data } = await supabase
      .from('concepts')
      .select('id, key, name, category, description, difficulty, files, depends_on, position')
      .eq('project_id', projectId)
      .order('position');
    concepts = (data || []) as Concept[];
  }
  return { status, detail, progress: Number(p?.concepts_progress || 0), concepts };
}

export async function startConcepts(projectId: string, userId: string, regenerate = false): Promise<ConceptsResponse> {
  requireLlm();
  const supabase = createClient();
  const { data: p } = await supabase.from('projects').select('status').eq('id', projectId).single();
  if (p?.status !== 'ready') throw new BrainError('Wait until the repository has finished importing.', 409);
  const current = await getConcepts(projectId);
  if (current.status === 'generating') return current;
  if (current.status === 'ready' && !regenerate) return current;

  await supabase
    .from('projects')
    .update({ concepts_status: 'generating', concepts_detail: 'Starting', concepts_progress: 0.01, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', userId);
  runInBackground('concepts', () => generateConcepts(projectId, userId));
  return { status: 'generating', detail: 'Starting', progress: 0.01, concepts: [] };
}

// ── Course ──────────────────────────────────────────────────────────────────
export async function getCourse(projectId: string, userId: string): Promise<Course | null> {
  const supabase = createClient();
  const { data: c } = await supabase.from('courses').select('*').eq('project_id', projectId).maybeSingle();
  if (!c) return null;
  const { data: done } = await supabase.from('lesson_progress').select('lesson_id').eq('course_id', c.id).eq('user_id', userId);
  let status = c.status as Course['status'];
  let detail = c.status_detail as string | null;
  if (status === 'generating' && isStale(c.updated_at)) {
    status = 'failed';
    detail = 'Course writing stopped unexpectedly. Try again.';
  }
  return {
    id: c.id,
    project_id: c.project_id,
    title: c.title,
    status,
    status_detail: detail,
    progress: Number(c.progress || 0),
    modules: c.modules || [],
    completed_lesson_ids: (done || []).map((d) => d.lesson_id),
    updated_at: c.updated_at,
  };
}

export async function startCourse(projectId: string, userId: string, level: Level, regenerate = false): Promise<Course> {
  requireLlm();
  const concepts = await getConcepts(projectId);
  if (concepts.status !== 'ready') throw new BrainError('Map the concepts before building the course.', 409);
  const existing = await getCourse(projectId, userId);
  if (existing && existing.status === 'generating') return existing;
  if (existing && existing.status === 'ready' && !regenerate) return existing;

  const supabase = createClient();
  const row = { project_id: projectId, user_id: userId, title: null, status: 'generating', status_detail: 'Starting', progress: 0.01, modules: [], updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('courses').upsert(row, { onConflict: 'project_id' }).select('id').single();
  if (error || !data) throw new BrainError(`Could not start the course: ${error?.message}`, 500);
  if (regenerate) await supabase.from('lesson_progress').delete().eq('course_id', data.id);
  runInBackground('course', () => generateCourse(data.id, projectId, userId, level));
  return (await getCourse(projectId, userId))!;
}

export async function setLessonDone(projectId: string, userId: string, lessonId: string, done: boolean): Promise<string[]> {
  const course = await getCourse(projectId, userId);
  if (!course) throw new BrainError('Course not found', 404);
  if (!course.modules.some((m) => m.lessons.some((l) => l.id === lessonId))) throw new BrainError('Lesson not found', 404);
  const supabase = createClient();
  if (done) {
    await supabase.from('lesson_progress').upsert({ user_id: userId, course_id: course.id, lesson_id: lessonId }, { onConflict: 'user_id,course_id,lesson_id' });
  } else {
    await supabase.from('lesson_progress').delete().eq('user_id', userId).eq('course_id', course.id).eq('lesson_id', lessonId);
  }
  return (await getCourse(projectId, userId))!.completed_lesson_ids;
}

// ── Quiz ────────────────────────────────────────────────────────────────────
interface AttemptRow {
  id: string;
  project_id: string;
  user_id: string;
  attempt_no: number;
  status: QuizAttempt['status'];
  status_detail: string | null;
  questions: StoredQuestion[];
  answers: Record<string, GradedAnswer>;
  scores: AspectScores | null;
  average: number | null;
  unlocked: boolean;
  created_at: string;
  submitted_at: string | null;
}

async function certCodeFor(userId: string, projectId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from('certificates').select('code').eq('user_id', userId).eq('project_id', projectId).eq('revoked', false).maybeSingle();
  return data?.code ?? null;
}

async function toAttempt(row: AttemptRow): Promise<QuizAttempt> {
  let status = row.status;
  let detail = row.status_detail;
  if (status === 'generating' && isStale(row.created_at)) {
    status = 'failed';
    detail = 'Question writing stopped unexpectedly. Start a new attempt.';
  }
  return {
    id: row.id,
    project_id: row.project_id,
    attempt_no: row.attempt_no,
    status,
    status_detail: detail,
    questions: status === 'generating' ? [] : (row.questions || []).map(toPublic),
    answers: row.answers || {},
    scores: row.scores,
    average: row.average,
    unlocked: row.unlocked,
    created_at: row.created_at,
    submitted_at: row.submitted_at,
    certificate_code: row.unlocked ? await certCodeFor(row.user_id, row.project_id) : null,
  };
}

export async function listAttempts(projectId: string, userId: string): Promise<QuizAttempt[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('attempt_no', { ascending: false });
  return Promise.all(((data || []) as AttemptRow[]).map(toAttempt));
}

export async function startAttempt(projectId: string, userId: string): Promise<QuizAttempt> {
  requireLlm();
  const concepts = await getConcepts(projectId);
  if (concepts.status !== 'ready') throw new BrainError('Map the concepts before taking the quiz.', 409);
  const attempts = await listAttempts(projectId, userId);
  const open = attempts.find((a) => a.status === 'generating' || (a.status === 'ready' && !a.submitted_at));
  if (open) throw new BrainError('Finish your current attempt first.', 409);

  const supabase = createClient();
  const attemptNo = (attempts[0]?.attempt_no || 0) + 1;
  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({ project_id: projectId, user_id: userId, attempt_no: attemptNo, status: 'generating', status_detail: 'Starting' })
    .select('*')
    .single();
  if (error || !data) throw new BrainError(`Could not start the quiz: ${error?.message}`, 500);
  runInBackground('quiz', () => generateQuiz(data.id, projectId, userId, attemptNo));
  return toAttempt(data as AttemptRow);
}

async function loadAttempt(attemptId: string, userId: string): Promise<AttemptRow> {
  const supabase = createClient();
  const { data } = await supabase.from('quiz_attempts').select('*').eq('id', attemptId).eq('user_id', userId).maybeSingle();
  if (!data) throw new BrainError('Attempt not found', 404);
  return data as AttemptRow;
}

export async function getAttempt(attemptId: string, userId: string): Promise<QuizAttempt> {
  return toAttempt(await loadAttempt(attemptId, userId));
}

export async function answerQuestion(attemptId: string, userId: string, questionId: string, answer: string): Promise<GradedAnswer> {
  const row = await loadAttempt(attemptId, userId);
  if (row.status !== 'ready' || row.submitted_at) throw new BrainError('This attempt is not open for answers.', 409);
  const q = row.questions.find((x) => x.id === questionId);
  if (!q) throw new BrainError('Question not found', 404);
  if (q.type === 'mcq' && !/^[0-3]$/.test(answer.trim())) throw new BrainError('Pick one of the options.', 400);

  let graded: GradedAnswer;
  try {
    graded = await withUsage({ projectId: row.project_id, step: 'grade' }, () => gradeAnswer(q, answer));
  } catch (err) {
    console.error('[brain] grading failed:', err);
    throw new BrainError('Grading is busy right now. Try submitting this answer again.', 503);
  }
  const supabase = createClient();
  // Re-read to merge with answers saved meanwhile (another tab).
  const fresh = await loadAttempt(attemptId, userId);
  const answers = { ...(fresh.answers || {}), [questionId]: graded };
  await supabase.from('quiz_attempts').update({ answers }).eq('id', attemptId).eq('user_id', userId);
  return graded;
}

export async function submitAttempt(attemptId: string, userId: string, recipientName: string): Promise<QuizAttempt> {
  const row = await loadAttempt(attemptId, userId);
  if (row.submitted_at) return toAttempt(row);
  if (row.status !== 'ready') throw new BrainError('This attempt is not ready.', 409);
  const missing = row.questions.filter((q) => !row.answers?.[q.id]);
  if (missing.length) throw new BrainError(`Answer all questions first (${missing.length} left).`, 409);

  const scores = aspectScores(row.questions.map((q) => ({ aspect: q.aspect, score: row.answers[q.id].score })));
  const avg = average(scores);
  const unlocked = isUnlocked(scores);
  const supabase = createClient();
  await supabase
    .from('quiz_attempts')
    .update({ status: 'submitted', scores, average: avg, unlocked, submitted_at: new Date().toISOString() })
    .eq('id', attemptId)
    .eq('user_id', userId);

  if (unlocked) await issueCertificate(row, scores, recipientName);
  return getAttempt(attemptId, userId);
}

// ── Certificates ────────────────────────────────────────────────────────────
async function issueCertificate(row: AttemptRow, scores: AspectScores, recipientName: string) {
  const supabase = createClient();
  const [{ data: project }, { data: concepts }, { data: existing }] = await Promise.all([
    supabase.from('projects').select('repo_full_name, commit_sha, ownership_pct').eq('id', row.project_id).single(),
    supabase.from('concepts').select('key, name, category').eq('project_id', row.project_id).order('position'),
    supabase.from('certificates').select('*').eq('user_id', row.user_id).eq('project_id', row.project_id).maybeSingle(),
  ]);

  // Concept strength = mean score of the questions that tested it, else the overall average.
  const byConcept = new Map<string, number[]>();
  for (const q of row.questions) {
    const s = row.answers[q.id]?.score;
    if (typeof s === 'number') byConcept.set(q.concept_key, [...(byConcept.get(q.concept_key) || []), s]);
  }
  const overall = average(scores);
  const conceptList = (concepts || []).map((c) => {
    const s = byConcept.get(c.key);
    const mean = s?.length ? s.reduce((a, b) => a + b, 0) / s.length : overall;
    return { name: c.name, category: c.category, strength: strengthFor(mean) };
  });

  const now = new Date().toISOString();
  const entry = { version: (existing?.version || 0) + 1, overall, scores, commit_sha: project?.commit_sha ?? null, at: now };
  const base = {
    user_id: row.user_id,
    project_id: row.project_id,
    attempt_id: row.id,
    recipient_name: recipientName,
    repo_full_name: project?.repo_full_name || '',
    commit_sha: project?.commit_sha ?? null,
    scores,
    overall,
    ownership_pct: project?.ownership_pct ?? null,
    concepts: conceptList,
    updated_at: now,
  };

  if (existing) {
    await supabase
      .from('certificates')
      .update({ ...base, version: entry.version, history: [...(existing.history || []), entry], revoked: false })
      .eq('id', existing.id);
    return;
  }
  for (let i = 0; i < 5; i++) {
    const { error } = await supabase.from('certificates').insert({ ...base, code: newCertificateCode(), version: 1, history: [entry], issued_at: now });
    if (!error) return;
    if (!/duplicate key/i.test(error.message) || /user_id/.test(error.message)) throw new BrainError(`Could not issue certificate: ${error.message}`, 500);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped Supabase row
function toCertificate(c: Record<string, any>): LearningCertificate {
  return {
    code: c.code,
    recipient_name: c.recipient_name,
    repo_full_name: c.repo_full_name,
    project_id: c.project_id,
    commit_sha: c.commit_sha,
    level: c.level,
    scores: c.scores,
    overall: c.overall,
    ownership_pct: c.ownership_pct === null ? null : Number(c.ownership_pct),
    concepts: c.concepts || [],
    version: c.version,
    history: c.history || [],
    issued_at: c.issued_at,
    updated_at: c.updated_at,
    sample: false,
  };
}

export async function listCertificates(userId: string): Promise<LearningCertificate[]> {
  const supabase = createClient();
  const { data } = await supabase.from('certificates').select('*').eq('user_id', userId).eq('revoked', false).order('updated_at', { ascending: false });
  return (data || []).map(toCertificate);
}

export async function certificateByCode(code: string): Promise<LearningCertificate | null> {
  if (!/^PJ-\d{4}-[A-Z0-9]{6}$/.test(code)) return null;
  const supabase = createClient();
  const { data } = await supabase.from('certificates').select('*').eq('code', code).eq('revoked', false).maybeSingle();
  return data ? toCertificate(data) : null;
}

export async function learningSummaries(userId: string): Promise<LearningSummary[]> {
  const supabase = createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('id, repo_full_name, concepts_status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (!projects?.length) return [];
  const ids = projects.map((p) => p.id);
  const [{ data: courses }, { data: progress }, { data: attempts }, { data: certs }] = await Promise.all([
    supabase.from('courses').select('id, project_id, status, title, modules').in('project_id', ids),
    supabase.from('lesson_progress').select('course_id').eq('user_id', userId),
    supabase.from('quiz_attempts').select('project_id, attempt_no, status, average, unlocked').eq('user_id', userId).in('project_id', ids).order('attempt_no', { ascending: false }),
    supabase.from('certificates').select('project_id, code').eq('user_id', userId).eq('revoked', false),
  ]);
  return projects.map((p) => {
    const c = courses?.find((x) => x.project_id === p.id);
    const a = attempts?.find((x) => x.project_id === p.id);
    return {
      project_id: p.id,
      repo_full_name: p.repo_full_name,
      concepts_status: (p.concepts_status || 'none') as GenStatus,
      course: c
        ? {
            status: c.status,
            title: c.title,
            lessons_total: (c.modules || []).reduce((t: number, m: { lessons: unknown[] }) => t + m.lessons.length, 0),
            lessons_done: (progress || []).filter((x) => x.course_id === c.id).length,
          }
        : null,
      latest_attempt: a ? { attempt_no: a.attempt_no, status: a.status, average: a.average, unlocked: a.unlocked } : null,
      certificate_code: certs?.find((x) => x.project_id === p.id)?.code ?? null,
    };
  });
}
