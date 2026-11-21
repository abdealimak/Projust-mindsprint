import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-[6px] border border-border bg-canvas-subtle overflow-hidden', className)}
      {...props}
    >
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
        'flex items-center justify-between px-3.5 py-2.5 border-b border-border text-[13px] font-semibold text-fg',
        className
      )}
    >
      <div className="flex items-center gap-2">{title || children}</div>
      {action && <div>{action}</div>}
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
  return <div className={cn('p-3.5', className)}>{children}</div>;
}
