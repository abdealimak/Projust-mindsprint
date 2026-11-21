'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Footer actions (buttons). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Accessible modal dialog: focus trap, Esc closes, click outside closes, focus restored on close.
 * Ink/30 overlay (no blur), white sheet with a 20px radius, opacity + scale entrance.
 */
export function Dialog({ open, onClose, title, description, children, actions, className }: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    restoreRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      setShown(true);
      const sheet = sheetRef.current;
      if (!sheet) return;
      const first =
        sheet.querySelector<HTMLElement>('[data-autofocus]') || sheet.querySelector<HTMLElement>(FOCUSABLE);
      (first || sheet).focus();
    });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const items = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-[rgba(17,17,16,0.3)]',
        'transition-opacity duration-200 ease-land motion-reduce:transition-none',
        shown ? 'opacity-100' : 'opacity-0'
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'w-full max-w-[440px] bg-sheet border border-line rounded-m p-6 shadow-lift outline-none',
          'transition-[opacity,transform] duration-200 ease-land motion-reduce:transition-none motion-reduce:transform-none',
          shown ? 'opacity-100 scale-100' : 'opacity-0 scale-[.96]',
          className
        )}
      >
        <h2 id={titleId} className="font-serif text-[28px] leading-[1.1] tracking-[-0.01em] text-ink">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-2 text-[14.5px] text-muted leading-relaxed">
            {description}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
        {actions && <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">{actions}</div>}
      </div>
    </div>,
    document.body
  );
}
