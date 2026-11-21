import React from 'react';
import Link from 'next/link';
import { Page, PageHeader } from '@/components/layout/PageHeader';

/**
 * Editorial list of practice projects. These are ideas to build, not live courses:
 * no learner counts, no enrolment. "Start" sends you to import the repo once you have built it.
 */
const IDEAS: {
  id: string;
  title: string;
  build: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  hours: string;
  skills: string[];
  checks: string;
}[] = [
  {
    id: 'url-shortener',
    title: 'URL shortener with caching',
    build: 'An API that turns long links into short codes, redirects fast, and counts clicks.',
    level: 'Beginner',
    hours: '4–6 h',
    skills: ['Hashing and ID design', 'Redis caching', 'Atomic counters'],
    checks: 'Why your short codes never collide, and what happens when the cache is cold.',
  },
  {
    id: 'auth-api',
    title: 'Session auth from scratch',
    build: 'Sign up, sign in and sign out with hashed passwords, httpOnly cookies and CSRF protection.',
    level: 'Beginner',
    hours: '5–8 h',
    skills: ['Password hashing', 'Cookies and sessions', 'CSRF'],
    checks: 'How a stolen cookie could be used, and what your code does to stop it.',
  },
  {
    id: 'realtime-chat',
    title: 'Realtime chat with presence',
    build: 'Rooms, typing indicators and online status over WebSockets, with reconnects that do not lose messages.',
    level: 'Intermediate',
    hours: '8–12 h',
    skills: ['WebSockets', 'Heartbeats', 'Message ordering'],
    checks: 'What a client sees after a dropped connection, and how you dedupe messages.',
  },
  {
    id: 'payments',
    title: 'Checkout with idempotent payments',
    build: 'A cart and checkout that talks to a payment provider in test mode and handles webhooks safely.',
    level: 'Intermediate',
    hours: '10–14 h',
    skills: ['Idempotency keys', 'Webhook signatures', 'DB transactions'],
    checks: 'Why a retried request never charges twice, and how you verify a webhook.',
  },
  {
    id: 'rate-limiter',
    title: 'Rate limiter middleware',
    build: 'A drop-in limiter for an HTTP API with per-user quotas and clear 429 responses.',
    level: 'Intermediate',
    hours: '4–6 h',
    skills: ['Sliding windows', 'Token buckets', 'Shared state'],
    checks: 'How your limiter behaves across two server instances.',
  },
  {
    id: 'multi-tenant',
    title: 'Multi-tenant SaaS with row-level security',
    build: 'One database, many organisations, and no way for one to read another’s rows.',
    level: 'Advanced',
    hours: '14–20 h',
    skills: ['Postgres RLS', 'JWT claims', 'Safe migrations'],
    checks: 'Where tenant isolation is enforced, and what breaks if a policy is missing.',
  },
];

const LEVEL_TONE: Record<(typeof IDEAS)[number]['level'], string> = {
  Beginner: 'bg-[#E6F5D0] text-[#3F6212]',
  Intermediate: 'bg-[#E3EEFF] text-[#1F4E8C]',
  Advanced: 'bg-[#FFE6D9] text-[#963A12]',
};

export default function ExplorePage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Explore"
        title="Practice projects"
        em="worth building."
        description="Ideas for projects that teach real production skills. Build one on your own GitHub, then import it so Projust can check you understand it."
      />

      <p className="mb-6 text-[14px] text-muted max-w-[68ch]">
        These are suggestions, not courses. Your course and quiz are written from the code you actually push, so two
        people building the same idea get different questions.
      </p>

      <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {IDEAS.map((idea) => (
          <li key={idea.id} className="pj-card p-5 sm:p-6 flex flex-col">
            <div className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className={`px-2.5 py-0.5 rounded-full font-medium ${LEVEL_TONE[idea.level]}`}>
                {idea.level}
              </span>
              <span className="text-muted">About {idea.hours}</span>
            </div>

            <h2 className="pj-display text-[28px] leading-[1.05] mt-5">{idea.title}</h2>
            <p className="mt-3 text-[14.5px] text-ink-2 leading-relaxed">{idea.build}</p>

            <div className="mt-5">
              <h3 className="text-[12.5px] font-medium text-muted">Skills it exercises</h3>
              <ul className="mt-2 space-y-1.5">
                {idea.skills.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-[14px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-olive shrink-0" aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 rounded-s bg-paper px-4 py-3 text-[13.5px] text-ink-2 leading-snug">
              <span className="block text-[12px] font-medium text-muted mb-1">The quiz will ask</span>
              {idea.checks}
            </div>

            <div className="mt-auto pt-6 flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-muted">Build it on your GitHub first</span>
              <Link href="/projects/new" className="pj-btn pj-btn-ghost pj-btn-sm">
                Import it
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </Page>
  );
}
