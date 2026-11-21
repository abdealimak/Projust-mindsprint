'use client';

import React, { useEffect, useState } from 'react';
import { Check, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IngestionStepperProps {
  projectId: string;
  initialStatus: string;
  initialDetail?: string;
  onReady: () => void;
}

const ORDER = ['pending', 'ingesting', 'indexing', 'summarizing', 'ready'] as const;

const STEPS: { id: string; name: string; hint: string; at: (typeof ORDER)[number] }[] = [
  { id: 'download', name: 'Read the repository', hint: 'Metadata, commits and the code archive from GitHub', at: 'ingesting' },
  { id: 'indexing', name: 'Index the files', hint: 'Skip generated files, check who wrote what, make code searchable', at: 'indexing' },
  { id: 'summary', name: 'Write the summary', hint: 'A plain-language overview of how the project fits together', at: 'summarizing' },
  { id: 'ready', name: 'Ready to learn', hint: 'Concepts, tutor, course and quiz unlock', at: 'ready' },
];

export function IngestionStepper({
  projectId,
  initialStatus,
  initialDetail,
  onReady,
}: IngestionStepperProps) {
  const [status, setStatus] = useState(initialStatus);
  const [detail, setDetail] = useState(initialDetail || 'Queued for processing...');
  const [lastActive, setLastActive] = useState<string>(initialStatus === 'failed' ? 'ingesting' : initialStatus);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'ready') {
      onReady();
      return;
    }
    if (status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/status`);
        const data = await res.json();
        if (data && data.status) {
          setStatus(data.status);
          if (data.status !== 'failed') setLastActive(data.status);
          if (data.status_detail) setDetail(data.status_detail);
          if (data.status === 'ready') {
            clearInterval(interval);
            onReady();
          }
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [projectId, status, onReady]);

  const handleRetry = async () => {
    setRetryError(null);
    setStatus('pending');
    setLastActive('pending');
    setDetail('Retrying ingestion...');
    try {
      // POST /api/projects/[id] re-runs ingestion (same call as the Re-sync button).
      const res = await fetch(`/api/projects/${projectId}`, { method: 'POST' });
      if (!res.ok) throw new Error();
    } catch {
      setStatus('failed');
      setRetryError('The retry did not start. Try again in a moment.');
    }
  };

  const failed = status === 'failed';
  const cur = ORDER.indexOf((lastActive as (typeof ORDER)[number]) || 'pending');

  return (
    <div className="pj-card max-w-[640px] mx-auto my-6 sm:my-10 p-6 sm:p-10" aria-live="polite">
      <h2 className="pj-display text-[clamp(30px,3.4vw,40px)]">
        {failed ? (
          <>
            Reading stopped. <em>Nothing was lost.</em>
          </>
        ) : (
          <>
            Reading your repository. <em>This takes a minute or two.</em>
          </>
        )}
      </h2>
      <p className={cn('mt-3 text-[15px]', failed ? 'text-[#9B1C23]' : 'text-muted')}>{detail}</p>

      <ol className="mt-8 space-y-0">
        {STEPS.map((s, i) => {
          const stepIdx = ORDER.indexOf(s.at);
          const done = cur > stepIdx || status === 'ready';
          const active = !done && stepIdx === Math.max(cur, 1);
          const isFailedStep = failed && active;
          return (
            <li key={s.id} className="relative flex gap-4 pb-6 last:pb-0">
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className={cn('absolute left-[13px] top-8 bottom-1 w-px', done ? 'bg-[#9BC46A]' : 'bg-line')} />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'relative w-7 h-7 shrink-0 rounded-full grid place-items-center border text-[12.5px] tabular-nums',
                  done
                    ? 'bg-[#3F7F1F] border-[#3F7F1F] text-white'
                    : isFailedStep
                      ? 'bg-[#FDECEC] border-[#F5CFCF] text-[#B4232C]'
                      : active
                        ? 'bg-lime border-[#B9D84A] text-ink'
                        : 'bg-sheet border-line text-muted'
                )}
              >
                {done ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                ) : isFailedStep ? (
                  <AlertCircle className="w-4 h-4" />
                ) : active ? (
                  <span className="w-3 h-3 rounded-full border-2 border-ink border-r-transparent animate-spin motion-reduce:animate-none" />
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={cn('text-[15px] font-medium leading-tight', !done && !active && 'text-muted')}>
                  {s.name}
                  <span className="sr-only">{done ? ' (done)' : isFailedStep ? ' (failed)' : active ? ' (in progress)' : ''}</span>
                </p>
                <p className="text-[13.5px] text-muted mt-0.5">{s.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {failed && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleRetry} className="pj-btn">
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Try again
          </button>
          {retryError && (
            <p role="alert" className="text-[14px] text-[#B4232C]">
              {retryError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
