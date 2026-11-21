import React from 'react';
import Link from 'next/link';
import { getLearningSummaries } from '@/lib/data';
import { PageHeader } from '@/components/layout/PageHeader';
import { UNLOCK_AVERAGE, UNLOCK_FLOOR, type LearningSummary } from '@/types/learning';

function courseState(s: LearningSummary) {
  const c = s.course;
  if (!c) {
    return s.concepts_status === 'ready'
      ? { label: 'Build course', note: 'Concepts are mapped. The course is not built yet.', pct: 0 }
      : { label: 'Build course', note: 'Map the concepts first, then build the course.', pct: 0 };
  }
  if (c.status === 'generating') return { label: 'View progress', note: 'Writing lessons now.', pct: 0 };
  if (c.status === 'failed') return { label: 'Build again', note: 'The last build stopped. Build it again.', pct: 0 };
  const pct = c.lessons_total ? Math.round((c.lessons_done / c.lessons_total) * 100) : 0;
  return {
    label: c.lessons_done === 0 ? 'Start course' : pct === 100 ? 'Review course' : 'Continue',
    note: `${c.lessons_done} of ${c.lessons_total} lessons done`,
    pct,
  };
}

export default async function CoursesPage() {
  const summaries = await getLearningSummaries();

  return (
    <div className="px-5 sm:px-10 lg:px-14 py-10 lg:py-12 max-w-[1240px] mx-auto w-full">
      <PageHeader
        eyebrow="Learn"
        title="Courses built from"
        em="your own code."
        description={`Every lesson quotes your repository. Quizzes score six skills, and a certificate unlocks at an average of ${UNLOCK_AVERAGE} with no skill under ${UNLOCK_FLOOR}.`}
      />

      {summaries.length === 0 ? (
        <div className="pj-card px-6 py-14 sm:py-16 text-center">
          <h3 className="pj-display text-[clamp(30px,3.2vw,40px)]">
            No courses yet. <em>Import a project first.</em>
          </h3>
          <p className="mt-4 text-[15.5px] text-muted max-w-[52ch] mx-auto">
            A course is built from one of your GitHub repositories. Import one and we map its concepts and write the lessons.
          </p>
          <Link href="/projects/new" className="pj-btn mt-7">
            Import a repository
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summaries.map((s) => {
            const st = courseState(s);
            const attempt = s.latest_attempt;
            return (
              <li key={s.project_id} className="pj-card p-5 sm:p-6 flex flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[12.5px] text-muted truncate">{s.repo_full_name}</p>
                    <h3 className="font-serif text-[26px] leading-[1.1] mt-1.5">
                      {s.course?.title || s.repo_full_name.split('/').pop()}
                    </h3>
                  </div>
                  {s.course?.status === 'ready' && (
                    <span className="font-serif text-[34px] leading-none tabular-nums shrink-0">{st.pct}%</span>
                  )}
                </div>

                <div className="mt-5">
                  <p className="text-[13.5px] text-muted">{st.note}</p>
                  {s.course?.status === 'ready' && (
                    <div className="mt-2 h-[3px] bg-line rounded-full overflow-hidden">
                      <div className="h-full bg-ink rounded-full" style={{ width: `${st.pct}%` }} />
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-5 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[13px] text-muted">
                    {s.certificate_code ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-[#E6F5D0] text-[#3F6212] border border-[#CFE6AE]">
                        Certificate issued
                      </span>
                    ) : attempt?.status === 'submitted' ? (
                      <>Last quiz: {attempt.average ?? '-'}</>
                    ) : (
                      'No quiz taken'
                    )}
                  </span>
                  <Link
                    href={`/projects/${s.project_id}?tab=${s.course || s.concepts_status === 'ready' ? 'course' : 'concepts'}`}
                    className={s.course ? 'pj-btn !min-h-[36px] text-[13.5px]' : 'pj-btn pj-btn-ghost !min-h-[36px] text-[13.5px]'}
                  >
                    {s.course || s.concepts_status === 'ready' ? st.label : 'Map concepts'}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
