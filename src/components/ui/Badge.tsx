import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'attention' | 'danger' | 'accent' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

/** Landing-style chip. `accent` is the lime highlighter; `purple` maps to orange (no violet). */
export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  const variants = {
    default: 'bg-sheet text-ink-2 border-line',
    success: 'bg-[#E6F5D0] text-[#3F6212] border-[#CFE6AE]',
    attention: 'bg-[#FDF3DC] text-[#8A5A0B] border-[#F1DEAF]',
    danger: 'bg-[#FDECEC] text-[#B4232C] border-[#F5CFCF]',
    accent: 'bg-lime text-ink border-[#B9D84A]',
    purple: 'bg-[#FFE6D9] text-[#963A12] border-[#FFCBB0]',
  };

  const sizes = {
    sm: 'text-[12px] px-2.5 py-0.5',
    md: 'text-[13px] px-3 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border leading-tight select-none',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
