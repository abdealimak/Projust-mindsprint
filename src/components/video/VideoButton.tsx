'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Play } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import type { ExplainerProps } from './ConceptExplainer';
import type { CertificateRevealProps } from './CertificateReveal';

const Loading = () => (
  <div className="w-full aspect-video rounded-[14px] bg-paper-2 border border-line grid place-items-center text-[14px] text-muted">
    Loading video…
  </div>
);

// Remotion only loads when a video is opened
const ExplainerPlayer = dynamic(() => import('./players').then((m) => m.ExplainerPlayer), { ssr: false, loading: Loading });
const CertificatePlayer = dynamic(() => import('./players').then((m) => m.CertificatePlayer), { ssr: false, loading: Loading });

type VideoButtonProps = {
  label: string;
  title: string;
  description?: string;
  className?: string;
  variant?: 'ghost' | 'solid';
} & ({ kind: 'explainer'; video: ExplainerProps } | { kind: 'certificate'; video: CertificateRevealProps });

/** A button that opens a short animated video (Remotion player) in a dialog. */
export function VideoButton(props: VideoButtonProps) {
  const [open, setOpen] = useState(false);
  const { label, title, description, className, variant = 'ghost' } = props;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-medium cursor-pointer transition-colors',
          variant === 'solid' ? 'bg-ink text-paper hover:bg-ink-2' : 'border border-line bg-sheet text-ink hover:border-ink/40',
          className
        )}
      >
        <span aria-hidden="true" className="w-4 h-4 rounded-full bg-lime grid place-items-center">
          <Play className="w-2.5 h-2.5 fill-ink text-ink ml-[1px]" />
        </span>
        {label}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        className="max-w-[min(960px,calc(100vw-32px))] p-4 sm:p-6"
      >
        {open &&
          (props.kind === 'explainer' ? <ExplainerPlayer video={props.video} /> : <CertificatePlayer video={props.video} />)}
      </Dialog>
    </>
  );
}
