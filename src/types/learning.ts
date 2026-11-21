/**
 * Learning data contract: concepts → course → quiz → six scores → certificate.
 * Shared by the AI brain (src/lib/brain), the API routes and the UI.
 * See docs/LEARNING_CONTRACT.md for the routes.
 */

export const ASPECTS = [
  'concept_understanding',
  'code_comprehension',
  'debugging',
  'architecture_design',
  'security_best_practices',
  'ai_collaboration',
] as const;
export type Aspect = (typeof ASPECTS)[number];

export const ASPECT_LABELS: Record<Aspect, string> = {
  concept_understanding: 'Concepts',
  code_comprehension: 'Code',
  debugging: 'Debugging',
  architecture_design: 'Architecture',
  security_best_practices: 'Security',
  ai_collaboration: 'AI collaboration',
};

/** Certificate unlock rule: average ≥ 60 and no aspect below 40. */
export const UNLOCK_AVERAGE = 60;
export const UNLOCK_FLOOR = 40;

export interface CodeRef {
  path: string;
  startLine: number;
  endLine: number;
}

export type GenStatus = 'none' | 'generating' | 'ready' | 'failed';

export interface Concept {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string;
  difficulty: 'intro' | 'core' | 'advanced';
  files: CodeRef[];
  depends_on: string[];
  position: number;
}

export interface ConceptsResponse {
  status: GenStatus;
  detail: string | null;
  progress: number; // 0..1
  concepts: Concept[];
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  body_md: string;
  code_refs: CodeRef[];
  check_questions: string[];
}

export interface CourseModule {
  id: string;
  title: string;
  concept_keys: string[];
  lessons: Lesson[];
}

export interface Course {
  id: string;
  project_id: string;
  title: string | null;
  status: 'generating' | 'ready' | 'failed';
  status_detail: string | null;
  progress: number; // generation progress 0..1
  modules: CourseModule[];
  completed_lesson_ids: string[];
  updated_at: string;
}

export type QuestionType = 'mcq' | 'free_text' | 'find_the_bug' | 'what_if';

/** What the browser sees: no answer key, no rubric weights. */
export interface PublicQuestion {
  id: string;
  aspect: Aspect;
  type: QuestionType;
  prompt_md: string;
  code: (CodeRef & { snippet: string }) | null;
  options: string[] | null; // mcq only
}

export interface GradedAnswer {
  answer: string;
  score: number; // 0..100
  feedback_md: string;
  study_tip: string;
  rubric_hits: { point: string; hit: boolean }[];
  graded_at: string;
}

export type AspectScores = Record<Aspect, number>;

export interface QuizAttempt {
  id: string;
  project_id: string;
  attempt_no: number;
  status: 'generating' | 'ready' | 'submitted' | 'failed';
  status_detail: string | null;
  questions: PublicQuestion[];
  answers: Record<string, GradedAnswer>;
  scores: AspectScores | null;
  average: number | null;
  unlocked: boolean;
  created_at: string;
  submitted_at: string | null;
  certificate_code: string | null; // set once unlocked
}

export interface LearningCertificate {
  code: string;
  recipient_name: string;
  repo_full_name: string;
  project_id: string;
  commit_sha: string | null;
  level: string;
  scores: AspectScores;
  overall: number;
  ownership_pct: number | null;
  concepts: { name: string; category: string; strength: 'proficient' | 'advanced' | 'master' }[];
  version: number;
  history: { version: number; overall: number; scores: AspectScores; commit_sha: string | null; at: string }[];
  issued_at: string;
  updated_at: string;
  sample: boolean; // true for demo/sample certificates — UI must label them
}

export interface LearningSummary {
  project_id: string;
  repo_full_name: string;
  concepts_status: GenStatus;
  course: { status: Course['status']; lessons_total: number; lessons_done: number; title: string | null } | null;
  latest_attempt: { attempt_no: number; status: QuizAttempt['status']; average: number | null; unlocked: boolean } | null;
  certificate_code: string | null;
}
