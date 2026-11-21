import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getCertificateByCode } from '@/lib/data';
import { getCurrentUser } from '@/lib/auth/user';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CertificatePaper, CopyLinkButton, VerifyForm } from './CertActions';
import { VideoButton } from '@/components/video/VideoButton';

export const dynamic = 'force-dynamic';

// Same as fmtCertDate in CertActions (a client module, so the server can't call it). UTC keeps the day stable.
const fmtCertDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const shortSha = (sha: string | null) => (sha ? sha.slice(0, 7) : null);

/** Absolute origin of this request, so the QR code on the paper points back at this exact page. */
function requestOrigin() {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) ? 'http' : 'https');
  return `${proto.split(',')[0].trim()}://${host.split(',')[0].trim()}`;
}

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

  const history = [...(cert.history || [])].sort((a, b) => b.version - a.version);
  const verifyUrl = `${requestOrigin()}/cert/${cert.code}`;

  const facts: [string, React.ReactNode][] = [
    [
      'Status',
      <span key="s" className="inline-flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${cert.sample ? 'bg-[#E0A84A]' : 'bg-lime'}`} aria-hidden />
        {cert.sample ? 'Sample, not a real person' : 'Valid'}
      </span>,
    ],
    ['Certificate ID', <span key="c" className="font-mono text-[13px]">{cert.code}</span>],
    ['Level', cert.level],
    ['First issued', fmtCertDate(cert.issued_at)],
    ['Last updated', fmtCertDate(cert.updated_at)],
  ];
  if (cert.ownership_pct != null) facts.push(['Commits by recipient', `${Math.round(cert.ownership_pct)}%`]);

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header signedIn={!!user} />

      {/* One dark band, like the certificate section on the landing page */}
      <main className="flex-1 w-full bg-[#121211] text-[#F3F1EC]">
        <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-10 py-10 lg:py-16">
          {cert.sample && (
            <div
              role="note"
              className="mb-8 lg:mb-10 rounded-[14px] border border-[#4A3D1E] bg-[#1F1B12] px-5 py-4 text-[14.5px] text-[#E9D7AE]"
            >
              <strong className="font-semibold text-[#F6E7C2]">Sample certificate.</strong> This is demo data to
              show what a Projust certificate looks like. It was not earned by a real person.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-12 items-start">
            <div className="lg:col-span-7 w-full max-w-[760px]">
              <CertificatePaper cert={cert} verifyUrl={verifyUrl} tone="dark" />
              <div className="mt-5">
                <VideoButton
                  kind="certificate"
                  label="Play the reveal"
                  title={`${cert.recipient_name}'s certificate`}
                  description="A 10-second animated version of this certificate."
                  video={{
                    code: cert.code,
                    recipientName: cert.recipient_name,
                    repo: cert.repo_full_name,
                    commitSha: cert.commit_sha,
                    level: cert.level,
                    scores: cert.scores,
                    overall: Math.round(cert.overall),
                    sample: cert.sample,
                  }}
                />
              </div>
            </div>

            <aside className="lg:col-start-9 lg:col-span-4 flex flex-col gap-8 min-w-0">
              <div>
                <span className="pj-eyebrow !text-[#A8A39A]">Verification</span>
                <h2 className="pj-display text-[clamp(34px,3.4vw,48px)] mt-4 [&_em]:!text-[#8E8A83]">
                  {cert.sample ? 'A sample credential.' : 'This certificate is genuine.'}{' '}
                  <em>{cert.sample ? 'Not issued to a real person.' : 'Issued and hosted by Projust.'}</em>
                </h2>
                <p className="mt-4 text-[15.5px] leading-relaxed text-[#A8A39A] max-w-[46ch]">
                  The scores come from quizzes built from this repository&rsquo;s own code. The certificate updates
                  when the recipient learns more, and every version is kept.
                </p>
              </div>

              <dl className="border-t border-[#2A2927] text-[14px]">
                {facts.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 py-3 border-b border-[#2A2927]">
                    <dt className="text-[#A8A39A]">{k}</dt>
                    <dd className="text-right text-[#F3F1EC]">{v}</dd>
                  </div>
                ))}
              </dl>

              {history.length > 0 && (
                <section aria-labelledby="history-heading">
                  <h3 id="history-heading" className="text-[14px] font-medium text-[#D6D1C7]">
                    Version history
                  </h3>
                  <ol className="mt-3 border-t border-[#2A2927] text-[14px]">
                    {history.map((h) => {
                      const current = h.version === cert.version;
                      const sha = shortSha(h.commit_sha);
                      return (
                        <li
                          key={h.version}
                          className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-baseline gap-3 py-3 border-b border-[#2A2927] ${
                            current ? 'text-[#F3F1EC]' : 'text-[#A8A39A]'
                          }`}
                        >
                          <span className={`font-mono text-[12px] ${current ? 'text-lime' : ''}`}>v{h.version}</span>
                          <span className="min-w-0 flex flex-wrap items-baseline gap-x-2.5">
                            {fmtCertDate(h.at)}
                            {sha && <span className="font-mono text-[12px] text-[#8E8A83]">{sha}</span>}
                            {current && (
                              <span className="font-mono text-[10.5px] px-2 py-px rounded-full border border-[#3A3936] text-[#D6D1C7]">
                                current
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[12px]">avg {Math.round(h.overall)}</span>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap gap-2">
                  <CopyLinkButton className="pj-btn !bg-[#F3F1EC] !border-[#F3F1EC] !text-[#121211] h-12 px-[22px] text-[15px]" />
                </div>
                <VerifyForm tone="dark" />
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
