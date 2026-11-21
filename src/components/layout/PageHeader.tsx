import React from 'react';
import { cn } from '@/lib/utils';

/** Standard page container used by every app page except the dashboard. `narrow` suits forms. */
export function Page({
  className,
  children,
  narrow = false,
}: {
  className?: string;
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div
      className={cn(
        'px-4 sm:px-10 lg:px-14 pt-8 pb-16 sm:pt-10 lg:pt-12 mx-auto w-full',
        narrow ? 'max-w-[1040px]' : 'max-w-[1240px]',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Landing-style page header: mono eyebrow, Instrument Serif title whose second clause
 * (`em`) is italic grey, muted lead, optional actions on the right.
 * The title is the page's h1 (the top bar only shows a small section label).
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
        'flex flex-col md:flex-row md:items-end justify-between gap-5 md:gap-8 pb-6 sm:pb-8 mb-8 border-b border-line',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && <span className="pj-eyebrow">{eyebrow}</span>}
        <h1
          className={cn(
            'pj-display text-[clamp(34px,4.2vw,56px)] leading-[1.02] max-w-[20ch] text-balance',
            eyebrow && 'mt-3 sm:mt-4'
          )}
        >
          {title}
          {em && (
            <>
              {' '}
              <em>{em}</em>
            </>
          )}
        </h1>
        {description && (
          <p className="mt-3 sm:mt-4 text-[15.5px] sm:text-[16.5px] leading-relaxed text-muted max-w-[60ch]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 flex flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}
