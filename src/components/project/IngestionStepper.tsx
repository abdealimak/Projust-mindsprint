'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface IngestionStepperProps {
  projectId: string;
  initialStatus: string;
  initialDetail?: string;
  onReady: () => void;
}

export function IngestionStepper({
  projectId,
  initialStatus,
  initialDetail,
  onReady,
}: IngestionStepperProps) {
  const [status, setStatus] = useState(initialStatus);
  const [detail, setDetail] = useState(initialDetail || 'Queued for processing...');

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

  const steps = [
    { id: 'metadata', name: 'Fetching Metadata', active: status === 'pending' || status === 'ingesting' },
    { id: 'download', name: 'Downloading Archive', active: status === 'ingesting' },
    { id: 'indexing', name: 'Filtering & Indexing AST', active: status === 'indexing' },
    { id: 'summary', name: 'AI Architecture Summary', active: status === 'summarizing' },
    { id: 'ready', name: 'Ready for Viva', active: status === 'ready' },
  ];

  const handleRetry = async () => {
    setStatus('pending');
    setDetail('Retrying ingestion...');
    await fetch(`/api/projects/${projectId}/resync`, { method: 'POST' });
  };

  return (
    <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161a26] text-center space-y-6 shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-900 dark:text-white">
        {status === 'failed' ? (
          <AlertCircle className="w-6 h-6 text-red-500" />
        ) : status === 'ready' ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        ) : (
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white capitalize">
          {status === 'failed' ? 'Ingestion Failed' : 'Ingesting Repository'}
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
          {detail}
        </p>
      </div>

      {/* Stepper indicator */}
      <div className="flex items-center justify-center gap-2 py-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                s.active
                  ? 'bg-blue-500 ring-4 ring-blue-500/20 scale-110'
                  : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            />
            {i < steps.length - 1 && (
              <div className="w-6 sm:w-10 h-0.5 bg-neutral-200 dark:bg-neutral-800" />
            )}
          </div>
        ))}
      </div>

      {status === 'failed' && (
        <button
          type="button"
          onClick={handleRetry}
          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-xs font-semibold shadow-xs transition flex items-center gap-1.5 mx-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Ingestion</span>
        </button>
      )}
    </div>
  );
}
