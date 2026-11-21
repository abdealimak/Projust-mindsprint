import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  max = 100,
  className,
  color = 'bg-ink',
  label,
}: {
  value: number;
  max?: number;
  className?: string;
  color?: string;
  /** Accessible name. When given, the bar is exposed as a progressbar. */
  label?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={cn('w-full h-1 bg-line rounded-full overflow-hidden', className)}
      {...(label
        ? {
            role: 'progressbar',
            'aria-label': label,
            'aria-valuemin': 0,
            'aria-valuemax': max,
            'aria-valuenow': value,
          }
        : {})}
    >
      <div
        className={cn('h-full transition-[width] duration-300 ease-land rounded-full', color)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-xl bg-line/70', className)} />;
}

export { Avatar } from './Avatar';

/**
 * Empty state: white sheet with a dashed warm border, serif title, muted body, actions.
 * `secondaryAction` sits next to `action`; `compact` trims the padding for side panels.
 */
export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  icon,
  compact = false,
  className,
}: {
  title: React.ReactNode;
  description: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  icon?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-m border border-dashed border-line-2 bg-sheet',
        compact ? 'px-5 py-8' : 'px-6 py-12 sm:py-16',
        className
      )}
    >
      {icon && (
        <div className="mb-4 w-12 h-12 rounded-[14px] grid place-items-center bg-paper border border-line text-muted">
          {icon}
        </div>
      )}
      <h3 className={cn('font-serif leading-tight text-ink', compact ? 'text-[24px]' : 'text-[clamp(26px,3vw,34px)]')}>
        {title}
      </h3>
      <p className={cn('text-muted max-w-[52ch] mt-2', compact ? 'text-[14px]' : 'text-[15px]')}>{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 w-full sm:w-auto">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

/**
 * Inline message strip. `info` uses the soft lime highlighter, `success` the pass green,
 * `error` the warn red. Errors are announced (role="alert").
 */
export function Callout({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: 'info' | 'success' | 'error' | 'neutral';
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'bg-lime-soft border-[#DCEB9E] text-ink-2',
    success: 'bg-[#EEF7E3] border-[#CFE6AE] text-[#2F5A12]',
    error: 'bg-[#FDECEC] border-[#F5CFCF] text-[#9F1F27]',
    neutral: 'bg-sheet border-line text-ink-2',
  };
  const Icon = tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : Info;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border px-4 py-3 text-[14px] leading-snug',
        tones[tone],
        className
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <Icon className="w-4 h-4 mt-[2px] shrink-0" aria-hidden />
        <div className="min-w-0">
          {title && <p className="font-semibold text-ink">{title}</p>}
          {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
        </div>
      </div>
      {action && <div className="shrink-0 sm:ml-2">{action}</div>}
    </div>
  );
}
