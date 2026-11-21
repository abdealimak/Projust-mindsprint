'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-canvas text-fg">
      <div className="text-4xl font-mono font-bold text-danger mb-3">500</div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h1>
      <p className="text-[14px] text-fg-muted max-w-md mb-6 leading-relaxed">
        {error.message || 'An unexpected error occurred while processing this request.'}
      </p>
      <div className="flex gap-3">
        <Button variant="default" onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="primary" onClick={() => (window.location.href = '/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
