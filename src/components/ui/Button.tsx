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

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: {
  href: string;
  variant?: 'primary' | 'secondary' | 'quiet';
  size?: 'md' | 'sm';
  className?: string;
  children?: React.ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap border ' +
    'transition-[transform,box-shadow,background-color,color] duration-200 ease-land active:scale-[0.97]';
  const variants: Record<string, string> = {
    primary:
      'bg-ink border-ink text-paper hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(0,0,0,.45)]',
    secondary:
      'bg-sheet border-line text-ink hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,.25)]',
    quiet: 'border-transparent text-ink hover:bg-sheet',
  };
  const sizes: Record<string, string> = {
    md: 'h-11 px-5 text-[15px]',
    sm: 'h-9 px-4 text-[14px]',
  };
  return (
    <a
      href={href}
      className={cn(base, variants[variant] || variants.primary, sizes[size] || sizes.md, className)}
      {...rest}
    >
      {children}
    </a>
  );
}

export function GitHubMark({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
