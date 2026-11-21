import React from 'react';
import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  max = 100,
  className,
  color = 'bg-accent',
}: {
  value: number;
  max?: number;
  className?: string;
  color?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full h-2 bg-border rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full transition-all duration-300 rounded-full', color)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded bg-border/40', className)}
    />
  );
}

export function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  className,
}: {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const [imageError, setImageError] = React.useState(false);

  const sizes = {
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-9 h-9 text-[13px]',
    lg: 'w-11 h-11 text-[15px]',
    xl: 'w-16 h-16 text-[22px]',
  };

  const initial = (fallback || 'U')[0]?.toUpperCase();

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-border bg-gradient-to-tr from-accent/20 to-accent/40 font-bold text-fg select-none shadow-xs',
        sizes[size],
        className
      )}
    >
      {src && !imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || 'Avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-semibold">{initial}</span>
      )}
    </div>
  );
}

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
      <h3 className="text-[15px] font-semibold text-fg mb-1">{title}</h3>
      <p className="text-[13px] text-fg-muted max-w-sm mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
