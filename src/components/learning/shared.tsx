'use client';

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { CodeRef } from '@/types/learning';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** fetch + JSON with the contract's `{ error }` shape turned into an ApiError. */
export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init || {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { 'Content-Type': 'application/json', ...(rest.headers || {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: 'no-store',
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null) || `Request failed (${res.status}).`;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

/** Calls `fn` every `ms` while `active`; stops on unmount or when inactive. */
export function usePoll(fn: () => void | Promise<void>, active: boolean, ms = 2500) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        await fnRef.current();
      } finally {
        if (!stopped) t = setTimeout(tick, ms);
      }
    };
    t = setTimeout(tick, ms);
    return () => {
      stopped = true;
      clearTimeout(t);
    };
  }, [active, ms]);
}

export function refLabel(r: CodeRef) {
  return r.startLine === r.endLine ? `${r.path}:${r.startLine}` : `${r.path}:${r.startLine}-${r.endLine}`;
}

/** Mono chip for a code reference; clicking opens the Files tab at that path. */
export function CodeRefChip({ codeRef, onOpen }: { codeRef: CodeRef; onOpen?: (r: CodeRef) => void }) {
  const label = refLabel(codeRef);
  const cls =
    'inline-flex items-center max-w-full font-mono text-[12px] px-2.5 py-1 rounded-full border border-line bg-paper-2 text-ink-2 hover:border-line-2 hover:bg-sheet transition-colors duration-200';
  if (onOpen) {
    return (
      <button type="button" onClick={() => onOpen(codeRef)} className={cn(cls, 'cursor-pointer')} title={`Open ${label}`}>
        <span className="truncate">{label}</span>
      </button>
    );
  }
  return (
    <a
      href={`?tab=files&path=${encodeURIComponent(codeRef.path)}&lines=${codeRef.startLine}-${codeRef.endLine}`}
      className={cls}
    >
      <span className="truncate">{label}</span>
    </a>
  );
}

/** Markdown with the app's reading styles. `size="read"` = lesson body typography. */
export function Markdown({ children, size = 'ui', className }: { children: string; size?: 'ui' | 'read'; className?: string }) {
  const read = size === 'read';
  return (
    <div
      className={cn(
        'text-ink-2 break-words [&_code]:[font-variant-ligatures:none]',
        read ? 'text-[17px] leading-[1.65] max-w-[68ch]' : 'text-[15px] leading-[1.6]',
        '[&>*:first-child]:mt-0 [&_p]:my-3 [&_ul]:my-3 [&_ol]:my-3 [&_ul]:pl-5 [&_ol]:pl-5 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:my-1',
        '[&_h1]:font-serif [&_h2]:font-serif [&_h3]:font-serif [&_h1]:text-ink [&_h2]:text-ink [&_h3]:text-ink [&_h1]:font-normal [&_h2]:font-normal [&_h3]:font-normal',
        read
          ? '[&_h1]:text-[34px] [&_h2]:text-[28px] [&_h3]:text-[22px] [&_h1]:mt-8 [&_h2]:mt-8 [&_h3]:mt-6 [&_h1]:mb-3 [&_h2]:mb-2 [&_h3]:mb-2 [&_h1]:leading-tight [&_h2]:leading-tight'
          : '[&_h1]:text-[24px] [&_h2]:text-[21px] [&_h3]:text-[18px] [&_h1]:mt-4 [&_h2]:mt-4 [&_h3]:mt-3 [&_h1]:mb-2 [&_h2]:mb-2',
        '[&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_strong]:text-ink',
        '[&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.86em] [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-paper [&_:not(pre)>code]:border [&_:not(pre)>code]:border-line',
        '[&_pre]:my-4 [&_pre]:bg-[#151514] [&_pre]:text-[#E9E6DF] [&_pre]:rounded-[12px] [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:text-[13px] [&_pre]:leading-[1.6] [&_pre_code]:font-mono',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-line-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted',
        '[&_table]:w-full [&_table]:text-[14px] [&_table]:my-4 [&_th]:text-left [&_th]:font-semibold [&_th]:border-b [&_th]:border-line [&_th]:py-2 [&_td]:border-b [&_td]:border-line [&_td]:py-2 [&_th]:pr-3 [&_td]:pr-3',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

/** Dark code block with line numbers starting at `startLine`. */
export function CodeBlock({ snippet, startLine = 1, path }: { snippet: string; startLine?: number; path?: string }) {
  const lines = snippet.replace(/\n$/, '').split('\n');
  const width = String(startLine + lines.length - 1).length;
  return (
    <figure className="rounded-[12px] overflow-hidden bg-[#151514] text-[#E9E6DF]">
      {path && (
        <figcaption className="px-4 py-2 border-b border-white/10 font-mono text-[12px] text-[#A8A39A] truncate">
          {path}
        </figcaption>
      )}
      <pre className="overflow-x-auto py-3 text-[13px] leading-[1.65] font-mono [font-variant-ligatures:none]">
        <code className="block min-w-max">
          {lines.map((l, i) => (
            <span key={i} className="flex">
              <span
                aria-hidden="true"
                className="select-none text-right text-[#6F6B64] pl-4 pr-4 shrink-0"
                style={{ width: `${width + 3}ch` }}
              >
                {startLine + i}
              </span>
              <span className="pr-4 whitespace-pre">{l || ' '}</span>
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

/** Centered message card for empty/error/locked states. */
export function StateCard({
  title,
  em,
  body,
  action,
  tone = 'default',
}: {
  title: string;
  em?: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  tone?: 'default' | 'error';
}) {
  return (
    <div className={cn('pj-card px-6 py-12 sm:px-12 sm:py-16 text-center', tone === 'error' && 'border-[#F5CFCF]')}>
      <h3 className="pj-display text-[clamp(30px,3.2vw,40px)] max-w-[28ch] mx-auto">
        {title}
        {em && (
          <>
            {' '}
            <em>{em}</em>
          </>
        )}
      </h3>
      {body && <div className="mt-4 text-[15.5px] text-muted max-w-[54ch] mx-auto">{body}</div>}
      {action && <div className="mt-7 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-[12px] border border-[#F5CFCF] bg-[#FDF1F1] text-[14px] text-[#9B1C23]">
      <span className="flex-1 min-w-[200px]">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="pj-btn pj-btn-ghost !min-h-[32px] !px-3.5 text-[13px]">
          Try again
        </button>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block w-4 h-4 rounded-full border-2 border-current border-r-transparent animate-spin motion-reduce:animate-none',
        className
      )}
    />
  );
}

export function GenerationProgress({ progress, detail, label }: { progress: number; detail: string | null; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, progress || 0)) * 100);
  return (
    <div className="pj-card p-6 sm:p-10" aria-live="polite">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="pj-display text-[clamp(28px,3vw,36px)]">{label}</h3>
        <span className="font-serif text-[34px] leading-none tabular-nums">{pct}%</span>
      </div>
      <div
        className="mt-5 h-[3px] bg-line rounded-full overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
      >
        <div className="h-full bg-ink rounded-full transition-[width] duration-300 ease-land" style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
      <p className="mt-3 text-[14px] text-muted min-h-[1.5em]">{detail || 'Starting…'}</p>
    </div>
  );
}

/** Body text for a failed GET: a 404 message stands alone, other errors get a retry hint. */
export function loadErrorText(e: unknown, fallback: string) {
  if (e instanceof ApiError && (e.status === 404 || e.status === 503)) return e.message;
  return `${e instanceof Error ? e.message : fallback} Check your connection, then try again.`;
}
