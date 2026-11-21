import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'attention' | 'danger' | 'accent' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  const variants = {
    default: 'bg-canvas-subtle text-fg-muted border-border',
    success: 'bg-[#238636]/15 text-[#3fb950] border-[#238636]/40',
    attention: 'bg-[#d29922]/15 text-[#d29922] border-[#d29922]/40',
    danger: 'bg-[#f85149]/15 text-[#f85149] border-[#f85149]/40',
    accent: 'bg-[#2f81f7]/15 text-[#58a6ff] border-[#2f81f7]/40',
    purple: 'bg-[#a371f7]/15 text-[#bc8cff] border-[#a371f7]/40',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-[12px] px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full border leading-tight select-none',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
