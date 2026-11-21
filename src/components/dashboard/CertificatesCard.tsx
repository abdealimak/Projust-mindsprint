import React from 'react';
import Link from 'next/link';
import { Certificate } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { TrophyIcon, ArrowRightIcon } from '@primer/octicons-react';

export function CertificatesCard({ certificates }: { certificates: Certificate[] }) {
  return (
    <div className="rounded-xl border border-border bg-canvas-subtle p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <TrophyIcon className="w-4 h-4 text-accent" />
          <h2 className="text-[14px] font-semibold text-fg">Certificates Earned</h2>
        </div>
        <Link href="/certificates" className="text-[12px] text-accent hover:underline font-medium">
          All ({certificates.length})
        </Link>
      </div>

      <div className="space-y-2.5">
        {certificates.slice(0, 2).map((cert) => (
          <Link
            key={cert.id}
            href={`/cert/${cert.cert_code}`}
            className="block p-3 rounded-lg border border-border bg-canvas hover:border-accent/40 transition-colors group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[12px] font-bold text-accent group-hover:underline">
                {cert.cert_code}
              </span>
              <Badge variant={cert.level === 'Interview-verified' ? 'purple' : 'success'}>
                {cert.level}
              </Badge>
            </div>
            <div className="text-[13px] font-semibold text-fg truncate">
              {cert.project_name}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-[11px] text-fg-muted font-mono">
              <span>Score: <strong className="text-fg">{cert.overall_score}/100</strong></span>
              <span>{cert.version}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="pt-3 mt-3 border-t border-border">
        <Link
          href="/certificates"
          className="flex items-center justify-center gap-1.5 text-[12px] text-accent hover:underline font-medium w-full text-center"
        >
          <span>Manage verification links</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
