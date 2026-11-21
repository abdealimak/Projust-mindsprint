import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'invisible';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, icon, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors select-none rounded-[6px] focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed border text-[14px]';

    const variants = {
      // Default: GitHub subtle button
      default:
        'bg-canvas-subtle hover:bg-canvas-inset border-border text-fg active:bg-canvas-inset shadow-sm',
      // Primary: GitHub green button
      primary:
        'bg-[#238636] hover:bg-[#2ea043] border-[#2ea043]/30 text-white shadow-sm font-semibold',
      // Danger: Red button
      danger:
        'bg-canvas-subtle hover:bg-danger hover:text-white border-border text-danger hover:border-danger shadow-sm',
      // Invisible: icon-only or flat text button
      invisible:
        'border-transparent bg-transparent hover:bg-canvas-subtle text-fg-muted hover:text-fg',
    };

    const sizes = {
      sm: 'h-7 px-2.5 text-[12px] gap-1.5',
      md: 'h-8 px-3 text-[14px] gap-2',
      lg: 'h-9 px-4 text-[14px] gap-2',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {icon && <span className="inline-flex shrink-0">{icon}</span>}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
