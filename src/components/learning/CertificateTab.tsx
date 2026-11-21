'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Misc';
import { ASPECTS, ASPECT_LABELS, UNLOCK_AVERAGE, UNLOCK_FLOOR, type LearningCertificate } from '@/types/learning';
import { api, StateCard } from './shared';
import { loadErrorText } from './shared';

interface Props {
  projectId: string;
  onGoToQuiz: () => void;
}

export function CertificateTab({ projectId, onGoToQuiz }: Props) {
  const [cert, setCert] = useState<LearningCertificate | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ certificates: LearningCertificate[] }>('/api/certificates');
      const mine = res.certificates
        .filter((c) => c.project_id === projectId)
        .sort((a, b) => b.version - a.version)[0];
      setCert(mine || null);
      setError(null);
    } catch (e) {
      setError(loadErrorText(e, 'Could not load certificates.'));
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (cert === undefined && error) {
    return (
      <StateCard
        tone="error"
        title="Certificates did not load."
        body={<p>{error}</p>}
        action={<Button onClick={load}>Try again</Button>}
      />
    );
  }

  if (cert === undefined) {
    return <Skeleton className="h-[320px] rounded-m" />;
  }

  if (!cert) {
    return (
      <StateCard
        title="No certificate"
        em="for this project yet."
        body={
          <p>
            Take the quiz. The certificate unlocks when your average is {UNLOCK_AVERAGE} or more and no skill is
            under {UNLOCK_FLOOR}. You can retake it as many times as you like.
          </p>
        }
        action={
          <Button variant="primary" onClick={onGoToQuiz}>
            Go to the quiz
          </Button>
        }
      />
    );
  }

  const url = typeof window !== 'undefined' ? `${window.location.origin}/cert/${cert.code}` : `/cert/${cert.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
      <article className="pj-card p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12.5px] text-muted">{cert.code}</span>
          {!cert.sample && (
            <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-[#E6F5D0] text-[#3F6212] border border-[#CFE6AE]">
              Verified
            </span>
          )}
          {cert.sample && (
            <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-[#FDF3DC] text-[#8A5A0B] border border-[#F1DEAF]">
              Sample
            </span>
          )}
        </div>
        <h3 className="pj-display text-[clamp(32px,3.6vw,48px)] mt-4">
          {cert.recipient_name} <em>understands {cert.repo_full_name.split('/').pop()}.</em>
        </h3>
        <p className="mt-3 text-[14.5px] text-muted">
          <span className="font-mono text-[13px]">{cert.repo_full_name}</span>
          {cert.commit_sha && <span className="font-mono text-[13px]"> @ {cert.commit_sha.slice(0, 7)}</span>}
          <span className="ml-2">Version {cert.version}</span>
          <span className="ml-2">{cert.level}</span>
        </p>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          {ASPECTS.map((a) => (
            <div key={a} className="border-t border-line pt-3">
              <p className="text-[13px] text-muted">{ASPECT_LABELS[a]}</p>
              <p className="font-serif text-[30px] leading-none mt-1 tabular-nums">{cert.scores[a]}</p>
            </div>
          ))}
        </div>

        {cert.concepts.length > 0 && (
          <div className="mt-8">
            <h4 className="text-[13px] font-medium text-muted mb-2">Concepts shown</h4>
            <div className="flex flex-wrap gap-1.5">
              {cert.concepts.slice(0, 10).map((c) => (
                <span key={c.name} className="pj-chip">
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      <aside className="pj-card p-5 space-y-4">
        <div className="flex items-end justify-between">
          <p className="text-[15px] font-medium">Overall</p>
          <span className="font-serif text-[56px] leading-none tabular-nums">{cert.overall}</span>
        </div>
        <div className="flex flex-col gap-2">
          <Link href={`/cert/${cert.code}`} className="pj-btn w-full">
            <ExternalLink className="w-4 h-4" />
            Open public page
          </Link>
          <Button onClick={copy} className="w-full" aria-live="polite">
            {copied ? <Check className="w-4 h-4 text-[#3F6212]" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Link copied' : 'Copy link'}
          </Button>
        </div>
        <p className="text-[13px] text-muted">
          Retake the quiz any time. A better score issues a new version under the same code.
        </p>
        <Button variant="invisible" size="sm" onClick={onGoToQuiz} className="-ml-3">
          Go to the quiz
        </Button>
      </aside>
    </div>
  );
}
