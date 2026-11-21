import React from 'react';
import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  max = 100,
  className,
  color = 'bg-ink',
}: {
  value: number;
  max?: number;
  className?: string;
  color?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full h-1 bg-line rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full transition-[width] duration-300 ease-land rounded-full', color)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-line/70', className)}
    />
  );
}

export { Avatar } from './Avatar';

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-xl bg-canvas-subtle/50">
      {icon && <div className="text-fg-muted mb-3">{icon}</div>}
      <h3 className="font-serif text-[26px] leading-tight text-ink mb-1.5">{title}</h3>
      <p className="text-[14.5px] text-muted max-w-sm mb-5">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
