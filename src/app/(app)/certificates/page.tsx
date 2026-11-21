import React from 'react';
import Link from 'next/link';
import { getCertificates } from '@/lib/data';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TrophyIcon } from '@primer/octicons-react';

export default async function CertificatesPage() {
  const certificates = await getCertificates();

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Dynamic Certificates</h1>
        <p className="text-[13px] text-fg-muted mt-0.5">
          Recruiter and professor verifiable credentials with unique IDs, dynamic version history, and radar breakdowns.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {certificates.map((cert) => (
          <Card key={cert.id} className="p-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] font-bold text-accent">
                  {cert.cert_code}
                </span>
                <Badge variant={cert.level === 'Interview-verified' ? 'purple' : 'success'}>
                  {cert.level}
                </Badge>
              </div>

              <div>
                <h3 className="text-[16px] font-semibold text-fg">{cert.project_name}</h3>
                <p className="text-[12px] font-mono text-fg-muted">{cert.repo_full_name}</p>
              </div>

              <div className="flex items-center gap-4 text-[12px] text-fg-muted">
                <span>Overall Score: <strong className="text-fg">{cert.overall_score}/100</strong></span>
                <span>Version: <strong className="font-mono text-fg">{cert.version}</strong></span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {cert.concepts_mastered.slice(0, 3).map((concept, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded bg-canvas border border-border text-fg-muted"
                  >
                    {concept.name} ({concept.strength})
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-fg-muted">
                Issued to {cert.recipient_name}
              </span>
              <Link href={`/cert/${cert.cert_code}`}>
                <Button size="sm" variant="default" icon={<TrophyIcon className="w-3.5 h-3.5" />}>
                  View Certificate
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
