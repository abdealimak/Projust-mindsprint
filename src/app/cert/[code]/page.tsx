import React from 'react';
import Link from 'next/link';
import { getProfile, getCertificateByCode } from '@/lib/data';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AspectRadar } from '@/components/charts/AspectRadar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  TrophyIcon,
  CheckCircleFillIcon,
  RepoIcon,
  ArrowRightIcon,
} from '@primer/octicons-react';

export default async function CertificatePlaceholderPage({
  params,
}: {
  params: { code: string };
}) {
  const profile = await getProfile();
  const cert = await getCertificateByCode(params.code);

  if (!cert) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas text-fg">
        <Header profile={profile} />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <h1 className="text-xl font-bold">Certificate Not Found</h1>
            <p className="text-fg-muted mt-2">No verification certificate matches {params.code}.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-fg">
      <Header profile={profile} />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Certificate Display Shell */}
        <div className="p-6 md:p-8 rounded-[8px] border-2 border-border bg-gradient-to-b from-canvas-subtle to-canvas shadow-xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrophyIcon className="w-6 h-6 text-accent" />
                <span className="font-mono text-sm tracking-wider uppercase text-fg-muted">
                  Official Projust Credential
                </span>
              </div>
              <h1 className="text-2xl font-bold text-fg tracking-tight">
                Certificate of Project Comprehension
              </h1>
            </div>

            <div className="flex flex-col sm:items-end">
              <span className="font-mono text-lg font-bold text-accent">
                {cert.cert_code}
              </span>
              <Badge variant={cert.level === 'Interview-verified' ? 'purple' : 'success'} className="mt-1">
                {cert.level}
              </Badge>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-fg-muted font-semibold">
                  Recipient
                </span>
                <p className="text-lg font-semibold text-fg">
                  <Link href={`/u/${cert.recipient_username}`} className="hover:text-accent underline">
                    {cert.recipient_name}
                  </Link>
                </p>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-fg-muted font-semibold">
                  Verified Repository
                </span>
                <p className="text-[14px] font-mono text-fg flex items-center gap-1.5 mt-0.5">
                  <RepoIcon className="w-4 h-4 text-fg-muted" />
                  {cert.repo_full_name}
                </p>
              </div>

              <div className="flex items-center gap-6 text-[12px] text-fg-muted">
                <div>
                  <span className="block font-semibold text-fg text-[14px]">
                    {cert.overall_score}/100
                  </span>
                  <span>Overall Score</span>
                </div>
                <div>
                  <span className="block font-semibold text-fg text-[14px]">
                    {cert.ownership_pct}%
                  </span>
                  <span>Commit Ownership</span>
                </div>
                <div>
                  <span className="block font-semibold text-fg text-[14px] font-mono">
                    {cert.version}
                  </span>
                  <span>Dynamic Version</span>
                </div>
              </div>
            </div>

            {/* Compact Radar */}
            <div className="flex flex-col items-center p-3 rounded-[6px] border border-border bg-canvas-subtle">
              <span className="text-[11px] text-fg-muted font-semibold uppercase tracking-wider mb-1">
                Six-Aspect Verification Radar
              </span>
              <AspectRadar scores={cert.scores} height={200} />
            </div>
          </div>

          {/* Mastered concepts */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-[13px] font-semibold text-fg mb-2">Concepts Mastered</h3>
            <div className="flex flex-wrap gap-2">
              {cert.concepts_mastered.map((c, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full border border-border bg-canvas text-[11px] text-fg flex items-center gap-1"
                >
                  <CheckCircleFillIcon className="w-3 h-3 text-success" />
                  <span>{c.name}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Action footer */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-fg-muted">
            <span>Verified dynamically via Projust Automated Ingestion & Viva engine.</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="default">
                Add to LinkedIn
              </Button>
              <Button size="sm" variant="primary" icon={<ArrowRightIcon className="w-3.5 h-3.5" />}>
                Detailed Report
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
