'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileCode, Copy, Check, WrapText, Crosshair, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CodeLines } from './CodeLines';
import { langFromPath, langLabel, tokenize } from './highlight';

interface CodeViewerProps {
  filePath?: string | null;
  content?: string | null;
  language?: string | null;
  highlightRange?: [number, number] | null; // [startLine, endLine]
  /** Called when the reader clicks a line number (shift-click extends the range). */
  onSelectLines?: (range: [number, number] | null) => void;
  /** Shown in the empty state. */
  emptyHint?: string;
  className?: string;
}

/** Lines rendered at once; long files grow in steps so the page stays responsive. */
const CHUNK = 1500;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function CodeViewer({
  filePath,
  content,
  language,
  highlightRange,
  onSelectLines,
  emptyHint,
  className,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<number | null>(null);

  const tokens = useMemo(
    () => (content == null || !filePath ? [] : tokenize(content, langFromPath(filePath, language))),
    [content, filePath, language]
  );
  const total = tokens.length;

  // Range clamped to the file, so a stale citation never points past the end.
  const range = useMemo<[number, number] | null>(() => {
    if (!highlightRange || total === 0) return null;
    const a = Math.max(1, Math.min(highlightRange[0], total));
    const b = Math.max(a, Math.min(highlightRange[1], total));
    return [a, b];
  }, [highlightRange, total]);

  const outOfRange = !!highlightRange && total > 0 && highlightRange[0] > total;

  const [limit, setLimit] = useState(CHUNK);
  useEffect(() => {
    setLimit(Math.max(CHUNK, range ? range[1] + 200 : 0));
  }, [filePath, range]);

  const jumpToRange = (smooth = true) => {
    const target = targetLineRef.current;
    const box = scrollRef.current;
    if (!target || !box) return;
    const top = target.offsetTop - box.clientHeight / 3;
    box.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (range) {
      requestAnimationFrame(() => jumpToRange(false));
    } else {
      scrollRef.current?.scrollTo({ top: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.[0], range?.[1], filePath]);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked; nothing to do */
    }
  };

  if (!filePath || content === undefined || content === null) {
    return (
      <div
        className={cn(
          'h-full min-h-[240px] flex flex-col items-center justify-center p-8 text-center rounded-m border border-dashed border-line-2 bg-paper-2',
          className
        )}
      >
        <FileCode className="w-7 h-7 mb-3 text-[#A8A39A]" aria-hidden="true" />
        <p className="text-[15px] font-medium text-ink">
          {filePath ? 'This file is not in the index' : 'No file open'}
        </p>
        <p className="mt-1 text-[14px] text-muted max-w-[40ch]">
          {filePath ? (
            <>
              <span className="font-mono text-[13px] break-all">{filePath}</span> was skipped when the repository was
              read (too large, binary or generated). Re-sync after changing it to include it.
            </>
          ) : (
            emptyHint || 'Pick a file from the list, or click a file:line chip anywhere in the project to open it here.'
          )}
        </p>
      </div>
    );
  }

  const parts = filePath.split('/');
  const name = parts.pop();
  const dir = parts.join('/');
  const shown = Math.min(limit, total);

  const clickLine = onSelectLines
    ? (n: number, e: React.MouseEvent) => {
        if (e.shiftKey && anchorRef.current != null) {
          const a = anchorRef.current;
          onSelectLines([Math.min(a, n), Math.max(a, n)]);
        } else if (range && range[0] === n && range[1] === n) {
          anchorRef.current = null;
          onSelectLines(null);
        } else {
          anchorRef.current = n;
          onSelectLines([n, n]);
        }
      }
    : undefined;

  return (
    <div className={cn('h-full flex flex-col rounded-m border border-line bg-sheet overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-line bg-paper-2 min-h-[52px]">
        <FileCode className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[13px] leading-tight truncate" title={filePath}>
            {dir && <span className="text-muted">{dir}/</span>}
            <span className="text-ink font-medium">{name}</span>
          </p>
          <p className="text-[12px] text-muted mt-0.5 tabular-nums">
            {langLabel(filePath)}
            <span className="mx-1.5 text-line-2" aria-hidden="true">/</span>
            {total.toLocaleString()} {total === 1 ? 'line' : 'lines'}
            <span className="mx-1.5 text-line-2" aria-hidden="true">/</span>
            {formatBytes(content.length)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <IconButton label={wrap ? 'Stop wrapping lines' : 'Wrap long lines'} pressed={wrap} onClick={() => setWrap((w) => !w)}>
            <WrapText className="w-4 h-4" />
          </IconButton>
          <IconButton label={copied ? 'Copied' : 'Copy file contents'} onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-pass" /> : <Copy className="w-4 h-4" />}
          </IconButton>
        </div>
      </div>

      {(range || outOfRange) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 border-b border-[#D9EAA0] bg-[#F6FBE3] text-[13px] text-ink-2" role="status">
          {outOfRange ? (
            <span>
              The cited lines ({highlightRange![0]}–{highlightRange![1]}) are past the end of this file. It may have
              changed since the citation was made.
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="w-2.5 h-2.5 rounded-[3px] bg-lime border border-[#B9D84A]" />
                Highlighted{' '}
                <span className="font-mono text-[12.5px] text-ink">
                  {range![0] === range![1] ? `line ${range![0]}` : `lines ${range![0]}–${range![1]}`}
                </span>
              </span>
              <span className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => jumpToRange(true)}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12.5px] font-medium hover:bg-sheet transition-colors duration-150 cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                  Jump to it
                </button>
                {onSelectLines && (
                  <button
                    type="button"
                    onClick={() => onSelectLines(null)}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12.5px] font-medium hover:bg-sheet transition-colors duration-150 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                    Clear
                  </button>
                )}
              </span>
            </>
          )}
        </div>
      )}

      {/* Code */}
      <div ref={scrollRef} className="relative flex-1 min-h-0 overflow-auto bg-sheet py-2" tabIndex={0} aria-label={`Contents of ${filePath}`}>
        {total === 1 && content === '' ? (
          <p className="px-4 py-6 text-[14px] text-muted">This file is empty.</p>
        ) : (
          <CodeLines
            lines={tokens}
            to={shown}
            highlight={range}
            wrap={wrap}
            firstHighlightRef={targetLineRef}
            onLineClick={clickLine}
            lineLabel={(n) => `Highlight line ${n}`}
          />
        )}
        {shown < total && (
          <div className="sticky left-0 flex flex-wrap items-center gap-2 px-4 py-4 border-t border-line text-[13.5px] text-muted">
            <span>
              Showing {shown.toLocaleString()} of {total.toLocaleString()} lines.
            </span>
            <button
              type="button"
              onClick={() => setLimit((l) => l + CHUNK)}
              className="h-8 px-3.5 rounded-full border border-line bg-sheet text-ink text-[13px] font-medium hover:border-line-2 cursor-pointer"
            >
              Show {Math.min(CHUNK, total - shown).toLocaleString()} more
            </button>
            <button
              type="button"
              onClick={() => setLimit(total)}
              className="h-8 px-3.5 rounded-full text-ink text-[13px] font-medium hover:bg-paper cursor-pointer"
            >
              Show all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function IconButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        'w-8 h-8 grid place-items-center rounded-full transition-colors duration-150 cursor-pointer',
        pressed ? 'bg-ink text-paper' : 'text-muted hover:text-ink hover:bg-sheet'
      )}
    >
      {children}
    </button>
  );
}
