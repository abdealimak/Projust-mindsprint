import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-canvas text-fg">
      <div className="text-6xl font-mono font-bold text-accent mb-3">404</div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Page not found</h1>
      <p className="text-[14px] text-fg-muted max-w-md mb-6 leading-relaxed">
        The page you are looking for doesn&apos;t exist, has been removed, or is temporarily unavailable.
      </p>
      <Link href="/dashboard">
        <Button variant="primary">Return to Dashboard</Button>
      </Link>
    </div>
  );
}
