import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'invisible';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

/**
 * Landing-page pill button family.
 * primary = ink pill, default = white ghost pill, danger = ghost with red text, invisible = flat.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, icon, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-medium select-none rounded-full border whitespace-nowrap ' +
      'transition-[transform,box-shadow,background-color,color] duration-200 ease-land ' +
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none';

    const variants = {
      default:
        'bg-sheet border-line text-ink hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,.25)] active:translate-y-0 active:scale-[.97]',
      primary:
        'bg-ink border-ink text-paper hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(0,0,0,.45)] active:translate-y-0 active:scale-[.97]',
      danger:
        'bg-sheet border-line text-warn hover:border-warn/40 hover:bg-[#FDF1F1]',
      invisible: 'border-transparent bg-transparent text-muted hover:text-ink hover:bg-sheet',
    };

    const sizes = {
      sm: 'h-8 px-3.5 text-[13px] gap-1.5',
      md: 'h-10 px-[18px] text-[14px] gap-2',
      lg: 'h-12 px-[22px] text-[15px] gap-2.5',
    };

    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {icon && <span className="inline-flex shrink-0">{icon}</span>}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
