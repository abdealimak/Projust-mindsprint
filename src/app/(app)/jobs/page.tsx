import React from 'react';
import Link from 'next/link';
import { Page, PageHeader } from '@/components/layout/PageHeader';

/**
 * Jobs is planned, not built. This page explains the idea and shows clearly marked
 * example listings. Nothing here is a real company or a real opening.
 */
const EXAMPLES = [
  {
    title: 'Backend engineer, payments',
    company: 'Example fintech startup',
    where: 'Remote',
    needs: 'Certificate on a payments or checkout repo, Security 70 or higher',
    why: 'Wants people who can explain idempotency keys and webhook signature checks in their own code.',
  },
  {
    title: 'Full-stack engineer, realtime',
    company: 'Example collaboration tool',
    where: 'Hybrid',
    needs: 'Certificate on a WebSocket repo, Architecture 65 or higher',
    why: 'Wants people who can walk through reconnect handling and message ordering in a project they built.',
  },
];

const STEPS = [
  {
    title: 'Companies post a role',
    body: 'Each role names the skills it needs and the minimum scores, instead of a keyword list.',
  },
  {
    title: 'You apply with a certificate',
    body: 'Your verified certificate link stands in for the résumé screen. It shows the repo, six scores and version history.',
  },
  {
    title: 'They check it themselves',
    body: 'Anyone can open the certificate page and confirm it was issued by Projust.',
  },
];

export default function JobsPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Planned"
        title="Jobs that check"
        em="understanding."
        description="Job listings are not live yet. When they are, companies will list roles that require a verified Projust certificate instead of a keyword-matched résumé."
        action={
          <Link href="/certificates" className="pj-btn pj-btn-ghost">
            View my certificates
          </Link>
        }
      />

      <section aria-labelledby="how-heading">
        <h3 id="how-heading" className="text-[15px] font-semibold">
          How it will work
        </h3>
        <ol className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="pj-card p-5">
              <span className="font-mono text-[12px] text-muted">Step {i + 1}</span>
              <h4 className="mt-2 text-[16px] font-semibold">{s.title}</h4>
              <p className="mt-1.5 text-[14px] text-muted leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="examples-heading" className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="examples-heading" className="text-[15px] font-semibold">
            What a listing could look like
          </h3>
          <span className="text-[13px] text-muted">Examples only. Not real companies or openings.</span>
        </div>

        <ul className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {EXAMPLES.map((job) => (
            <li
              key={job.title}
              className="relative rounded-m border border-dashed border-line-2 bg-paper-2 p-6"
            >
              <span className="absolute top-4 right-4 font-mono text-[11px] tracking-[.08em] uppercase px-2 py-0.5 rounded-full border border-line-2 text-muted bg-sheet">
                Example listing
              </span>
              <p className="text-[13px] text-muted pr-28">{job.company}</p>
              <h4 className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">{job.title}</h4>
              <p className="mt-1 text-[13.5px] text-muted">{job.where}</p>
              <p className="mt-4 text-[14px] text-ink-2 leading-relaxed">{job.why}</p>
              <div className="mt-4 rounded-s border border-line bg-sheet px-4 py-3 text-[13.5px]">
                <span className="text-muted">Requires: </span>
                {job.needs}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 pj-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-semibold">Get ready before listings open</h3>
          <p className="mt-1 text-[14px] text-muted max-w-[56ch]">
            Import a project you built and earn a certificate. It is the one thing a listing will ask for.
          </p>
        </div>
        <Link href="/projects/new" className="pj-btn shrink-0">
          Import a repository
        </Link>
      </div>
    </Page>
  );
}
