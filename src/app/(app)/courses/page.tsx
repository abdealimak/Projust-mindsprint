import React from 'react';
import Link from 'next/link';
import { BookOpen, Loader2 } from 'lucide-react';
import { getLearningSummaries } from '@/lib/data';
import { Page, PageHeader } from '@/components/layout/PageHeader';
import { EmptyState, ProgressBar } from '@/components/ui/Misc';
import { UNLOCK_AVERAGE, UNLOCK_FLOOR, type LearningSummary } from '@/types/learning';
import { cn } from '@/lib/utils';

function courseState(s: LearningSummary) {
  const c = s.course;
  if (!c) {
    return s.concepts_status === 'ready'
      ? { label: 'Build course', note: 'Concepts are mapped. The course is not built yet.', pct: 0, busy: false }
      : { label: 'Build course', note: 'Map the concepts first, then build the course.', pct: 0, busy: false };
  }
  if (c.status === 'generating') return { label: 'View progress', note: 'Writing lessons now.', pct: 0, busy: true };
  if (c.status === 'failed') return { label: 'Build again', note: 'The last build stopped. Build it again.', pct: 0, busy: false };
  const pct = c.lessons_total ? Math.round((c.lessons_done / c.lessons_total) * 100) : 0;
  return {
    label: c.lessons_done === 0 ? 'Start course' : pct === 100 ? 'Review course' : 'Continue',
    note: `${c.lessons_done} of ${c.lessons_total} lessons done`,
    pct,
    busy: false,
  };
}

function QuizStatus({ s }: { s: LearningSummary }) {
  const attempt = s.latest_attempt;
  if (s.certificate_code) {
    return (
      <Link
        href={`/cert/${s.certificate_code}`}
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-[#E6F5D0] text-[#3F6212] border border-[#CFE6AE] hover:border-[#3F6212]/40"
      >
        Certificate issued
      </Link>
    );
  }
  if (attempt?.status === 'submitted') {
    return (
      <span className="text-[13px] text-muted">
        Last quiz average{' '}
        <span className={cn('font-semibold tabular-nums', attempt.unlocked ? 'text-pass' : 'text-ink')}>
          {attempt.average ?? '-'}
        </span>
        {attempt.unlocked ? ', passed' : ''}
      </span>
    );
  }
  return <span className="text-[13px] text-muted">No quiz taken yet</span>;
}

export default async function CoursesPage() {
  const summaries = await getLearningSummaries();

  return (
    <Page>
      <PageHeader
        eyebrow="Learn"
        title="Courses built from"
        em="your own code."
        description="Every lesson quotes your repository. The quiz then scores six skills."
      />

      {summaries.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-5 h-5" aria-hidden />}
          title="No courses yet"
          description="A course is built from one of your GitHub repositories. Import one and Projust maps its concepts and writes the lessons."
          action={
            <Link href="/projects/new" className="pj-btn">
              Import a repository
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-line bg-paper-2 px-4 py-3 text-[13.5px] text-ink-2">
            <span className="font-medium text-ink">How a certificate unlocks</span>
            <span>
              Quiz average of <span className="font-semibold tabular-nums">{UNLOCK_AVERAGE}</span> or more
            </span>
            <span>
              No single skill under <span className="font-semibold tabular-nums">{UNLOCK_FLOOR}</span>
            </span>
          </div>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summaries.map((s) => {
              const st = courseState(s);
              const ready = s.course?.status === 'ready';
              const canBuild = Boolean(s.course) || s.concepts_status === 'ready';
              const title = s.course?.title || s.repo_full_name.split('/').pop();
              return (
                <li key={s.project_id} className="pj-card p-5 sm:p-6 flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-[12.5px] text-muted truncate">{s.repo_full_name}</p>
                      <h2 className="font-serif text-[26px] leading-[1.1] tracking-[-0.01em] mt-1.5 break-words">{title}</h2>
                    </div>
                    {ready && (
                      <span className="font-serif text-[36px] leading-none tabular-nums shrink-0" aria-hidden>
                        {st.pct}
                        <span className="text-[20px] text-muted">%</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-5 mb-5">
                    <p className="text-[13.5px] text-ink-2 flex items-center gap-1.5">
                      {st.busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted" aria-hidden />}
                      {st.note}
                    </p>
                    {ready && (
                      <ProgressBar
                        value={st.pct}
                        className="mt-2 h-[5px]"
                        color={st.pct === 100 ? 'bg-pass' : 'bg-ink'}
                        label={`${title} course progress`}
                      />
                    )}
                  </div>

                  <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line">
                    <QuizStatus s={s} />
                    <div className="flex items-center gap-2">
                      {ready && (
                        <Link href={`/projects/${s.project_id}?tab=quiz`} className="pj-btn pj-btn-ghost pj-btn-sm">
                          Quiz
                        </Link>
                      )}
                      <Link
                        href={`/projects/${s.project_id}?tab=${canBuild ? 'course' : 'concepts'}`}
                        className={cn('pj-btn pj-btn-sm', !s.course && 'pj-btn-ghost')}
                      >
                        {canBuild ? st.label : 'Map concepts'}
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Page>
  );
}
