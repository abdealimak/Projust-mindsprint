'use client';

import React from 'react';
import { cn } from '@/lib/utils';

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
        'relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-line bg-lime font-bold text-ink select-none',
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
