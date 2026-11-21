import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BadgeCheck } from 'lucide-react';
import { getCertificateByCode } from '@/lib/data';
import { getCurrentUser } from '@/lib/auth/user';
import { ASPECTS, ASPECT_LABELS, type LearningCertificate } from '@/types/learning';
import { AspectRadar } from '@/components/charts/AspectRadar';
import { ProjustLogo } from '@/components/ui/Logo';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CopyLinkButton, VerifyForm } from './CertActions';

export const dynamic = 'force-dynamic';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const shortSha = (sha: string | null) => (sha ? sha.slice(0, 7) : null);

const STRENGTH_BARS: Record<LearningCertificate['concepts'][number]['strength'], number> = {
  proficient: 1,
  advanced: 2,
  master: 3,
};

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const cert = await getCertificateByCode(params.code);
  if (!cert) return { title: 'Certificate not found — Projust' };
  return {
    title: `${cert.code} · ${cert.recipient_name} — Projust certificate`,
    description: `${cert.recipient_name} scored ${Math.round(cert.overall)}/100 on ${cert.repo_full_name}, verified by Projust.`,
  };
}

export default async function CertificatePage({ params }: { params: { code: string } }) {
  const [cert, user] = await Promise.all([getCertificateByCode(params.code), getCurrentUser()]);
  if (!cert) notFound();

  const overall = Math.round(cert.overall);
  const history = [...(cert.history || [])].sort((a, b) => b.version - a.version);
  const sha = shortSha(cert.commit_sha);

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header signedIn={!!user} />

      <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-10 py-10 lg:py-14">
        {cert.sample && (
          <div
            role="note"
            className="mb-8 rounded-m border border-[#F1DEAF] bg-[#FDF3DC] px-5 py-4 text-[14.5px] text-[#6B4708]"
          >
            <strong className="font-semibold">Sample certificate.</strong> This is demo data to show what a
            Projust certificate looks like. It was not earned by a real person.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* The credential itself */}
          <article
            aria-label={`Certificate ${cert.code}`}
            className="lg:col-span-7 relative rounded-[22px] bg-paper-2 border border-line shadow-card p-6 sm:p-9 overflow-hidden
                       before:content-[''] before:absolute before:inset-[10px] before:border before:border-line before:rounded-[14px] before:pointer-events-none"
          >
            <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <ProjustLogo className="text-[18px]" />
              <div className="font-mono text-[12px] text-muted sm:text-right">
                Certificate ID
                <b className="block text-ink font-medium text-[14px]">{cert.code}</b>
              </div>
            </div>

            <p className="relative mt-8 text-[12.5px] text-muted">Awarded to</p>
            <h1 className="relative pj-display text-[clamp(38px,5vw,58px)] mt-1 break-words">{cert.recipient_name}</h1>
            <p className="relative mt-3 text-[14px] text-muted break-all">
              for understanding <span className="font-mono text-ink">{cert.repo_full_name}</span>
              {sha && (
                <>
                  {' '}at commit <span className="font-mono text-ink">{sha}</span>
                </>
              )}
            </p>

            <div className="relative mt-8 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6 sm:gap-8 items-center">
              <div className="mx-auto w-full max-w-[240px] sm:max-w-none">
                <AspectRadar scores={cert.scores} height={210} />
              </div>
              <dl className="space-y-2.5">
                {ASPECTS.map((a) => {
                  const v = Math.round(cert.scores[a] ?? 0);
                  return (
                    <div key={a} className="grid grid-cols-[110px_1fr_32px] items-center gap-3 text-[13.5px]">
                      <dt className="text-ink-2">{ASPECT_LABELS[a]}</dt>
                      <dd className="h-1.5 rounded-full bg-line overflow-hidden" aria-hidden>
                        <span className="block h-full rounded-full bg-ink" style={{ width: `${v}%` }} />
                      </dd>
                      <dd className="font-mono text-[13px] text-right">{v}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>

            <div className="relative mt-8 grid grid-cols-3 gap-3 border-y border-line py-5">
              <div>
                <p className="pj-display text-[40px] sm:text-[48px]">
                  <span className="bg-lime px-1.5 rounded-[6px]">{overall}</span>
                </p>
                <p className="mt-1.5 text-[12.5px] text-muted">Overall, out of 100</p>
              </div>
              <div>
                <p className="pj-display text-[40px] sm:text-[48px]">
                  {cert.ownership_pct != null ? `${Math.round(cert.ownership_pct)}%` : '—'}
                </p>
                <p className="mt-1.5 text-[12.5px] text-muted">Commits by recipient</p>
              </div>
              <div>
                <p className="pj-display text-[40px] sm:text-[48px]">{cert.concepts.length}</p>
                <p className="mt-1.5 text-[12.5px] text-muted">Concepts mastered</p>
              </div>
            </div>

            {cert.concepts.length > 0 && (
              <div className="relative mt-6">
                <p className="text-[12.5px] text-muted mb-2.5">Concepts mastered</p>
                <ul className="flex flex-wrap gap-1.5">
                  {cert.concepts.map((c) => (
                    <li key={c.name} className="pj-chip" title={`${c.category}, ${c.strength}`}>
                      {c.name}
                      <span className="inline-flex gap-[2px]" aria-label={c.strength}>
                        {[1, 2, 3].map((n) => (
                          <span
                            key={n}
                            className={`w-1 h-2.5 rounded-[2px] ${n <= STRENGTH_BARS[c.strength] ? 'bg-ink' : 'bg-line-2'}`}
                          />
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="relative mt-7 pt-5 border-t border-dashed border-line-2 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2 text-[13.5px]">
                <span className="inline-block font-mono text-[11px] px-2.5 py-1 rounded-full bg-ink text-paper">
                  {cert.level}
                </span>
                <p className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-pass shrink-0" aria-hidden />
                  Verified by Projust on {fmtDate(cert.issued_at)}
                </p>
              </div>
              <p className="font-mono text-[11.5px] text-muted">
                v{cert.version}, updated {fmtDate(cert.updated_at)}
              </p>
            </div>
          </article>

          {/* Verification and history */}
          <aside className="lg:col-span-5 flex flex-col gap-6">
            <div>
              <span className="pj-eyebrow">Verification</span>
              <h2 className="pj-display text-[clamp(32px,3.4vw,44px)] mt-4">
                {cert.sample ? 'A sample credential.' : 'This certificate is genuine.'}{' '}
                <em>{cert.sample ? 'Not issued to a real person.' : 'Issued and hosted by Projust.'}</em>
              </h2>
              <p className="mt-4 text-[15px] text-muted max-w-[46ch]">
                The scores come from a quiz built from this repository&rsquo;s own code. The certificate updates
                when the recipient learns more, and every version is kept.
              </p>
            </div>

            <dl className="pj-card divide-y divide-line text-[14px]">
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <dt className="text-muted">Status</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  <span className={`w-2 h-2 rounded-full ${cert.sample ? 'bg-[#B7791F]' : 'bg-pass'}`} aria-hidden />
                  {cert.sample ? 'Sample' : 'Valid'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <dt className="text-muted">Certificate ID</dt>
                <dd className="font-mono text-[13px]">{cert.code}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <dt className="text-muted">First issued</dt>
                <dd>{fmtDate(cert.issued_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <dt className="text-muted">Last updated</dt>
                <dd>{fmtDate(cert.updated_at)}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              <CopyLinkButton />
            </div>

            {history.length > 0 && (
              <section aria-labelledby="history-heading">
                <h3 id="history-heading" className="text-[15px] font-semibold">
                  Version history
                </h3>
                <ol className="mt-3 pj-card divide-y divide-line">
                  {history.map((h) => {
                    const current = h.version === cert.version;
                    return (
                      <li key={h.version} className="flex items-center justify-between gap-4 px-5 py-3 text-[14px]">
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-[12.5px] w-7 shrink-0">v{h.version}</span>
                          <span className={current ? 'text-ink' : 'text-muted'}>{fmtDate(h.at)}</span>
                          {current && (
                            <span className="text-[11.5px] px-2 py-px rounded-full bg-olive text-[#F6F8EC]">Current</span>
                          )}
                        </span>
                        <span className="flex items-center gap-3 shrink-0">
                          {shortSha(h.commit_sha) && (
                            <span className="hidden sm:inline font-mono text-[12px] text-muted">{shortSha(h.commit_sha)}</span>
                          )}
                          <span className="font-mono text-[13px]">avg {Math.round(h.overall)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            <div className="pt-6 border-t border-line">
              <VerifyForm />
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
