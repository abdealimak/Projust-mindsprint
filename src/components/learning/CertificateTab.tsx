'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Misc';
import { UNLOCK_AVERAGE, UNLOCK_FLOOR, type LearningCertificate } from '@/types/learning';
import { CertificatePaper, fmtCertDate } from '@/app/cert/[code]/CertActions';
import { VideoButton } from '@/components/video/VideoButton';
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

  const history = [...(cert.history || [])].sort((a, b) => b.version - a.version);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
      <CertificatePaper cert={cert} verifyUrl={url} tone="light" nameAs="h3" className="max-w-[820px]" />

      <aside className="pj-card p-5 flex flex-col gap-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-medium">Your certificate</p>
            {cert.sample ? (
              <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-[#FDF3DC] text-[#8A5A0B] border border-[#F1DEAF]">
                Sample
              </span>
            ) : (
              <span className="text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-[#E6F5D0] text-[#3F6212] border border-[#CFE6AE]">
                Verified
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-[12.5px] text-muted">{cert.code}</p>
        </div>

        <div className="flex flex-col gap-2">
          <Link href={`/cert/${cert.code}`} className="pj-btn w-full">
            <ExternalLink className="w-4 h-4" aria-hidden />
            Open public page
          </Link>
          <VideoButton
            kind="certificate"
            variant="solid"
            label="Play certificate reveal"
            title="Your certificate, animated"
            description="A 10-second reveal you can screen-record and share."
            className="w-full justify-center h-10"
            video={certVideo(cert)}
          />
          <Button onClick={copy} className="w-full">
            {copied ? <Check className="w-4 h-4 text-[#3F6212]" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
            <span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span>
          </Button>
        </div>

        {history.length > 0 && (
          <div>
            <p className="text-[13px] font-medium text-muted">Version history</p>
            <ol className="mt-2 border-t border-line text-[13.5px]">
              {history.map((h) => {
                const current = h.version === cert.version;
                return (
                  <li
                    key={h.version}
                    className={`grid grid-cols-[26px_minmax(0,1fr)_auto] items-baseline gap-2.5 py-2.5 border-b border-line ${
                      current ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    <span className="font-mono text-[12px]">v{h.version}</span>
                    <span>{fmtCertDate(h.at)}</span>
                    <span className="font-mono text-[12px]">avg {Math.round(h.overall)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <p className="text-[13px] text-muted">
          Retake the quiz any time. A better score issues a new version under the same ID, and the old ones stay in
          the history.
        </p>
        <Button variant="invisible" size="sm" onClick={onGoToQuiz} className="-ml-3 self-start">
          Go to the quiz
        </Button>
      </aside>
    </div>
  );
}

function certVideo(cert: LearningCertificate) {
  return {
    code: cert.code,
    recipientName: cert.recipient_name,
    repo: cert.repo_full_name,
    commitSha: cert.commit_sha,
    level: cert.level,
    scores: cert.scores,
    overall: Math.round(cert.overall),
    sample: cert.sample,
  };
}
