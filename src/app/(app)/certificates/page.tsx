import React from 'react';
import Link from 'next/link';
import { Award } from 'lucide-react';
import { getCertificates } from '@/lib/data';
import { Page, PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/Misc';
import { ASPECTS, ASPECT_LABELS, UNLOCK_AVERAGE, UNLOCK_FLOOR } from '@/types/learning';
import { cn } from '@/lib/utils';

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function CertificatesPage() {
  const certificates = await getCertificates();

  return (
    <Page>
      <PageHeader
        eyebrow="Prove"
        title="Certificates"
        em="anyone can verify."
        description="Each one has a public ID, a version history and the six-skill breakdown behind it."
      />

      {certificates.length === 0 ? (
        <EmptyState
          icon={<Award className="w-5 h-5" aria-hidden />}
          title="No certificates yet"
          description={
            <>
              Open a project, work through its course and take the quiz. A certificate unlocks when your average is{' '}
              {UNLOCK_AVERAGE} or more and no skill is under {UNLOCK_FLOOR}.
            </>
          }
          action={
            <Link href="/courses" className="pj-btn">
              Go to my courses
            </Link>
          }
          secondaryAction={
            <Link href="/projects" className="pj-btn pj-btn-ghost">
              View projects
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {certificates.map((cert) => {
            const name = cert.repo_full_name.split('/').pop();
            return (
              <li key={`${cert.code}-${cert.version}`} className="relative">
                {/* Certificate frame: outer sheet + inner hairline, like the printed certificate */}
                <div className="h-full rounded-[22px] border border-line bg-sheet p-1.5">
                  <div className="h-full rounded-[17px] border border-line/80 p-5 sm:p-6 flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[12.5px] text-ink-2 break-all">{cert.code}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {cert.sample ? (
                          <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-[#FDF3DC] text-[#8A5A0B] border border-[#F1DEAF]">
                            Sample
                          </span>
                        ) : (
                          <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-[#E6F5D0] text-[#3F6212] border border-[#CFE6AE]">
                            Verified
                          </span>
                        )}
                        <span className="text-[12px] text-muted">Version {cert.version}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="font-serif text-[30px] leading-[1.05] tracking-[-0.01em] break-words">{name}</h2>
                        <p className="font-mono text-[12.5px] text-muted mt-1 truncate">{cert.repo_full_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="block font-serif text-[52px] leading-none tabular-nums">{cert.overall}</span>
                        <span className="text-[12px] text-muted">Overall</span>
                      </div>
                    </div>

                    <dl className="mt-5 mb-5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                      {ASPECTS.map((a) => {
                        const v = cert.scores[a];
                        return (
                          <div key={a} className="min-w-0">
                            <div className="flex justify-between gap-2 text-[12px]">
                              <dt className="text-muted truncate" title={ASPECT_LABELS[a]}>
                                {ASPECT_LABELS[a]}
                              </dt>
                              <dd className={cn('tabular-nums font-medium', v < UNLOCK_FLOOR ? 'text-warn' : 'text-ink')}>{v}</dd>
                            </div>
                            <div className="mt-1 h-[3px] bg-line rounded-full overflow-hidden" aria-hidden>
                              <div className="h-full bg-ink rounded-full" style={{ width: `${v}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </dl>

                    <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line">
                      <span className="text-[13px] text-muted">
                        {cert.recipient_name}, issued {formatDate(cert.issued_at)}
                      </span>
                      <Link href={`/cert/${cert.code}`} className="pj-btn pj-btn-ghost pj-btn-sm">
                        View certificate
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
