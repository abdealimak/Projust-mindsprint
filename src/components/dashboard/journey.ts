import type { LearningSummary } from '@/types/learning';

/** The five stages every project goes through, in order. */
export const JOURNEY = [
  { id: 'import', label: 'Import', short: 'Repo imported' },
  { id: 'concepts', label: 'Concepts', short: 'Concepts mapped' },
  { id: 'course', label: 'Course', short: 'Lessons read' },
  { id: 'quiz', label: 'Quiz', short: 'Six skills scored' },
  { id: 'certificate', label: 'Certificate', short: 'Certificate issued' },
] as const;

export type JourneyStage = (typeof JOURNEY)[number]['id'];

export interface NextStep {
  /** Index into JOURNEY of the stage the learner is on. 5 means everything is done. */
  index: number;
  title: string;
  note: string;
  cta: string;
  href: string;
  /** True while something is being generated and the learner can only wait. */
  busy?: boolean;
}

/** Works out where a project is in the flow and what to do next. Pure, so it runs on the server. */
export function nextStep(s: LearningSummary): NextStep {
  const base = `/projects/${s.project_id}`;

  if (s.concepts_status !== 'ready') {
    if (s.concepts_status === 'generating')
      return { index: 1, title: 'Mapping concepts', note: 'Projust is reading the code and listing the ideas it uses.', cta: 'View progress', href: `${base}?tab=concepts`, busy: true };
    if (s.concepts_status === 'failed')
      return { index: 1, title: 'Map the concepts again', note: 'The last run stopped before it finished.', cta: 'Try again', href: `${base}?tab=concepts` };
    return { index: 1, title: 'Map the concepts', note: 'Find the ideas this repository relies on, each tied to the lines that use it.', cta: 'Map concepts', href: `${base}?tab=concepts` };
  }

  const c = s.course;
  if (!c || c.status !== 'ready') {
    if (c?.status === 'generating')
      return { index: 2, title: 'Writing your course', note: 'Lessons are being written from your own code.', cta: 'View progress', href: `${base}?tab=course`, busy: true };
    if (c?.status === 'failed')
      return { index: 2, title: 'Build the course again', note: 'The last build stopped before it finished.', cta: 'Try again', href: `${base}?tab=course` };
    return { index: 2, title: 'Build the course', note: 'Concepts are mapped. Turn them into short lessons that quote your code.', cta: 'Build course', href: `${base}?tab=course` };
  }

  const attempt = s.latest_attempt;
  const submitted = attempt?.status === 'submitted';
  if (c.lessons_done < c.lessons_total && !submitted) {
    return {
      index: 2,
      title: c.lessons_done === 0 ? 'Start the course' : 'Continue the course',
      note: `${c.lessons_done} of ${c.lessons_total} lessons done. The quiz is open whenever you are ready.`,
      cta: c.lessons_done === 0 ? 'Start course' : 'Continue',
      href: `${base}?tab=course`,
    };
  }

  if (s.certificate_code) {
    return { index: 5, title: 'Certificate issued', note: 'Share the link. Anyone can open it and check the six scores.', cta: 'View certificate', href: `/cert/${s.certificate_code}` };
  }

  if (attempt?.unlocked) {
    return { index: 4, title: 'Claim your certificate', note: `You passed with an average of ${attempt.average ?? '-'}.`, cta: 'Claim certificate', href: `${base}?tab=certificate` };
  }

  if (attempt?.status === 'generating') {
    return { index: 3, title: 'Preparing your quiz', note: 'Questions are being written from your code.', cta: 'Open quiz', href: `${base}?tab=quiz`, busy: true };
  }

  return {
    index: 3,
    title: submitted ? 'Retake the quiz' : 'Take the quiz',
    note: submitted
      ? `Last average ${attempt?.average ?? '-'}. A certificate needs a higher score.`
      : 'Questions about your own code. It scores six skills.',
    cta: submitted ? 'Retake quiz' : 'Take quiz',
    href: `${base}?tab=quiz`,
  };
}

/** The project to feature on the dashboard: the first one still in progress, else the first one. */
export function featuredSummary(summaries: LearningSummary[]): LearningSummary | null {
  if (summaries.length === 0) return null;
  return summaries.find((s) => !s.certificate_code) || summaries[0];
}
