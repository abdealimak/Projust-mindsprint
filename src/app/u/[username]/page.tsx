import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { MarkGithubIcon } from '@primer/octicons-react';
import { getPublicProfile } from '@/lib/data';
import { getCurrentUser } from '@/lib/auth/user';
import { ASPECTS, ASPECT_LABELS, type AspectScores, type LearningCertificate } from '@/types/learning';
import { Avatar } from '@/components/ui/Misc';
import { AspectRadar } from '@/components/charts/AspectRadar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const dynamic = 'force-dynamic';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Best score per skill across all certificates. Null when there are none. */
function bestScores(certs: LearningCertificate[]): AspectScores | null {
  if (certs.length === 0) return null;
  const out = {} as AspectScores;
  for (const a of ASPECTS) out[a] = Math.max(...certs.map((c) => c.scores[a] ?? 0));
  return out;
}

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const data = await getPublicProfile(params.username);
  if (!data) return { title: 'Profile not found — Projust' };
  const name = data.profile.full_name || data.profile.username;
  return { title: `${name} — Projust`, description: data.profile.headline || `${name}'s verified Projust certificates.` };
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const [data, user] = await Promise.all([getPublicProfile(params.username), getCurrentUser()]);
  if (!data) notFound();

  const { profile, certificates, sample } = data;
  const name = profile.full_name || profile.username;
  const best = bestScores(certificates);
  const certs = [...certificates].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header signedIn={!!user} />

      <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-10 py-10 lg:py-14">
        {sample && (
          <div
            role="note"
            className="mb-8 rounded-m border border-[#F1DEAF] bg-[#FDF3DC] px-5 py-4 text-[14.5px] text-[#6B4708]"
          >
            <strong className="font-semibold">Sample profile — demo data.</strong> This page shows what a public
            Projust profile looks like. The person and certificates are not real.
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 mb-8 border-b border-line">
          <div className="flex items-start gap-5 min-w-0">
            <Avatar src={profile.avatar_url} alt={name} fallback={name} size="xl" />
            <div className="min-w-0">
              <h1 className="pj-display text-[clamp(38px,5vw,60px)] break-words">{name}</h1>
              <p className="mt-2 font-mono text-[13px] text-muted">@{profile.username}</p>
              {profile.headline && <p className="mt-3 text-[16.5px] text-ink-2 max-w-[56ch]">{profile.headline}</p>}
            </div>
          </div>
          {(profile.github_username || profile.linkedin_url) && (
            <div className="flex flex-wrap gap-2 shrink-0">
              {profile.github_username && (
                <a
                  href={`https://github.com/${encodeURIComponent(profile.github_username)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pj-btn pj-btn-ghost"
                >
                  <MarkGithubIcon size={16} aria-hidden />
                  GitHub
                </a>
              )}
              {profile.linkedin_url && /^https:\/\//.test(profile.linkedin_url) && (
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="pj-btn pj-btn-ghost">
                  <ExternalLink className="w-4 h-4" aria-hidden />
                  LinkedIn
                </a>
              )}
            </div>
          )}
        </header>

        {profile.bio && <p className="mb-10 text-[16px] text-ink-2 leading-relaxed max-w-[68ch]">{profile.bio}</p>}

        {certs.length === 0 ? (
          <div className="pj-card p-10 text-center">
            <h2 className="pj-display text-[32px]">No certificates yet.</h2>
            <p className="mt-3 text-[15px] text-muted max-w-[48ch] mx-auto">
              {name} has not earned a Projust certificate. Certificates appear here once a quiz on one of their
              repositories is passed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section aria-labelledby="certs-heading" className="lg:col-span-7">
              <h2 id="certs-heading" className="text-[15px] font-semibold">
                Verified certificates
                <span className="ml-2 font-normal text-muted">{certs.length}</span>
              </h2>
              <ul className="mt-4 space-y-3">
                {certs.map((c) => (
                  <li key={c.code}>
                    <Link
                      href={`/cert/${c.code}`}
                      className="group pj-card pj-card-hover p-5 flex items-center gap-5"
                    >
                      <div className="shrink-0 w-[68px] text-center">
                        <p className="pj-display text-[40px]">{Math.round(c.overall)}</p>
                        <p className="text-[11.5px] text-muted">overall</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[14px] text-ink truncate">{c.repo_full_name}</p>
                        <p className="mt-1 text-[13px] text-muted">
                          {c.level}, {c.concepts.length} concepts, updated {fmtDate(c.updated_at)}
                        </p>
                        <p className="mt-1.5 font-mono text-[12px] text-muted">{c.code}</p>
                      </div>
                      <ArrowUpRight
                        className="w-4 h-4 text-muted shrink-0 transition-transform duration-300 ease-land group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden
                      />
                      <span className="sr-only">Open certificate {c.code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {best && (
              <section aria-labelledby="skills-heading" className="lg:col-span-5 pj-card p-5">
                <h2 id="skills-heading" className="text-[15px] font-semibold">
                  Best score per skill
                </h2>
                <p className="mt-1 text-[13px] text-muted">Highest across {certs.length === 1 ? 'one certificate' : `${certs.length} certificates`}.</p>
                <AspectRadar scores={best} height={240} />
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-[13.5px]">
                  {ASPECTS.map((a) => (
                    <div key={a} className="flex items-center justify-between gap-2">
                      <dt className="text-muted">{ASPECT_LABELS[a]}</dt>
                      <dd className="font-mono">{Math.round(best[a])}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
