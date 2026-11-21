import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/** The one card look from the landing page: white sheet, 1px warm line, 20px radius. */
export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('rounded-m border border-line bg-sheet overflow-hidden', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  action,
  title,
}: {
  className?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  title?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line text-[14.5px] font-semibold text-ink',
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">{title || children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
