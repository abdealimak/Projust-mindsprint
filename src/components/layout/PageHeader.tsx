import React from 'react';
import { cn } from '@/lib/utils';

/** Standard page container used by every app page except the dashboard. */
export function Page({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('px-5 sm:px-10 lg:px-14 py-10 lg:py-12 max-w-[1240px] mx-auto w-full', className)}>
      {children}
    </div>
  );
}

/**
 * Landing-style page header: mono eyebrow, Instrument Serif title whose second clause
 * (`em`) is italic grey, muted lead, optional action on the right.
 */
export function PageHeader({
  eyebrow,
  title,
  em,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  em?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 mb-8 border-b border-line',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && <span className="pj-eyebrow">{eyebrow}</span>}
        <h2 className={cn('pj-display text-[clamp(36px,4.2vw,56px)] max-w-[20ch]', eyebrow && 'mt-4')}>
          {title}
          {em && (
            <>
              {' '}
              <em>{em}</em>
            </>
          )}
        </h2>
        {description && <p className="mt-4 text-[16.5px] text-muted max-w-[56ch]">{description}</p>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </header>
  );
}
