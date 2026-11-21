'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TOKEN_CLASS, type Tok } from './highlight';

/**
 * Renders tokenized code with a sticky line-number gutter and an optional highlighted range
 * (lime band + olive rule, the "highlighter" from the design system).
 */
export function CodeLines({
  lines,
  startLine = 1,
  from = 0,
  to,
  highlight,
  wrap = false,
  firstHighlightRef,
  onLineClick,
  lineLabel,
  className,
}: {
  lines: Tok[][];
  /** Number shown for lines[0]. */
  startLine?: number;
  /** Render only lines[from..to) (for long files). */
  from?: number;
  to?: number;
  /** Absolute line numbers [start, end], inclusive. */
  highlight?: [number, number] | null;
  wrap?: boolean;
  firstHighlightRef?: React.Ref<HTMLDivElement>;
  onLineClick?: (line: number, e: React.MouseEvent) => void;
  lineLabel?: (line: number) => string;
  className?: string;
}) {
  const end = Math.min(lines.length, to ?? lines.length);
  const last = startLine + lines.length - 1;
  const gutterCh = Math.max(2, String(last).length);
  const rows: React.ReactNode[] = [];

  for (let i = from; i < end; i++) {
    const n = startLine + i;
    const hl = !!highlight && n >= highlight[0] && n <= highlight[1];
    const first = hl && n === highlight![0];
    const toks = lines[i];
    rows.push(
      <div
        key={n}
        ref={first ? firstHighlightRef : undefined}
        data-line={n}
        className={cn('flex group/line', hl ? 'bg-[#F1F8D2]' : 'hover:bg-[#F7F5F0]')}
      >
        {onLineClick ? (
          <button
            type="button"
            onClick={(e) => onLineClick(n, e)}
            aria-label={lineLabel ? lineLabel(n) : `Line ${n}`}
            className={cn(
              'sticky left-0 z-[1] shrink-0 select-none text-right pr-3 pl-3 border-r tabular-nums cursor-pointer',
              'transition-colors duration-150 hover:text-ink hover:bg-lime-soft focus-visible:outline-offset-[-2px]',
              hl ? 'bg-[#E7F3B5] border-[#B9D84A] text-ink font-medium' : 'bg-sheet border-line text-[#8F8B84]'
            )}
            style={{ minWidth: `${gutterCh + 2.5}ch` }}
          >
            {n}
          </button>
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              'sticky left-0 z-[1] shrink-0 select-none text-right pr-3 pl-3 border-r tabular-nums',
              hl ? 'bg-[#E7F3B5] border-[#B9D84A] text-ink font-medium' : 'bg-sheet border-line text-[#8F8B84]'
            )}
            style={{ minWidth: `${gutterCh + 2.5}ch` }}
          >
            {n}
          </span>
        )}
        <span
          className={cn(
            'pl-4 pr-6 flex-1 text-ink',
            wrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre',
            hl && 'shadow-[inset_2px_0_0_#4A5A1E]'
          )}
        >
          {toks.length === 0 || (toks.length === 1 && toks[0].t === '')
            ? ' '
            : toks.map((t, j) =>
                t.k === 'plain' ? (
                  <React.Fragment key={j}>{t.t}</React.Fragment>
                ) : (
                  <span key={j} className={TOKEN_CLASS[t.k]}>
                    {t.t}
                  </span>
                )
              )}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'font-mono text-[12.5px] sm:text-[13px] leading-[1.7] [font-variant-ligatures:none] [tab-size:2]',
        !wrap && 'min-w-max',
        className
      )}
    >
      {rows}
    </div>
  );
}
