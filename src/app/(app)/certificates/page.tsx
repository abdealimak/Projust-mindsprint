import React from 'react';
import Link from 'next/link';
import { getCertificates } from '@/lib/data';
import { PageHeader } from '@/components/layout/PageHeader';
import { ASPECTS, ASPECT_LABELS, UNLOCK_AVERAGE, UNLOCK_FLOOR } from '@/types/learning';

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function CertificatesPage() {
  const certificates = await getCertificates();

  return (
    <div className="px-5 sm:px-10 lg:px-14 py-10 lg:py-12 max-w-[1240px] mx-auto w-full">
      <PageHeader
        eyebrow="Prove"
        title="Certificates"
        em="anyone can verify."
        description="Each one has a public ID, a version history and the six-skill breakdown behind it."
      />

      {certificates.length === 0 ? (
        <div className="pj-card px-6 py-14 sm:py-16 text-center">
          <h3 className="pj-display text-[clamp(30px,3.2vw,40px)]">
            No certificates yet. <em>Pass a quiz to earn one.</em>
          </h3>
          <p className="mt-4 text-[15.5px] text-muted max-w-[54ch] mx-auto">
            Open a project, work through its course and take the quiz. A certificate unlocks when your average is{' '}
            {UNLOCK_AVERAGE} or more and no skill is under {UNLOCK_FLOOR}.
          </p>
          <Link href="/projects" className="pj-btn mt-7">
            Go to projects
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certificates.map((cert) => (
            <li key={`${cert.code}-${cert.version}`} className="pj-card p-5 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[12.5px] text-muted truncate">{cert.code}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {cert.sample ? (
                    <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-[#FDF3DC] text-[#8A5A0B] border border-[#F1DEAF]">
                      Sample
                    </span>
                  ) : (
                    <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-[#E6F5D0] text-[#3F6212] border border-[#CFE6AE]">
                      Verified
                    </span>
                  )}
                  <span className="text-[12px] text-muted">Version {cert.version}</span>
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-serif text-[28px] leading-[1.05] truncate">{cert.repo_full_name.split('/').pop()}</h3>
                  <p className="font-mono text-[12.5px] text-muted mt-1 truncate">{cert.repo_full_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="block font-serif text-[48px] leading-none tabular-nums">{cert.overall}</span>
                  <span className="text-[12px] text-muted">Overall</span>
                </div>
              </div>

              <div className="mt-5 mb-5 grid grid-cols-3 gap-x-4 gap-y-2">
                {ASPECTS.map((a) => (
                  <div key={a} className="min-w-0">
                    <div className="flex justify-between text-[12px] text-muted">
                      <span className="truncate">{ASPECT_LABELS[a]}</span>
                      <span className="tabular-nums text-ink-2">{cert.scores[a]}</span>
                    </div>
                    <div className="mt-1 h-[3px] bg-line rounded-full overflow-hidden">
                      <div className="h-full bg-ink rounded-full" style={{ width: `${cert.scores[a]}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line">
                <span className="text-[13px] text-muted">
                  {cert.recipient_name}, issued {formatDate(cert.issued_at)}
                </span>
                <Link href={`/cert/${cert.code}`} className="pj-btn pj-btn-ghost !min-h-[36px] text-[13.5px]">
                  View certificate
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
