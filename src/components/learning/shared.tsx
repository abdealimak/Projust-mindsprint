'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileCode, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CodeRef } from '@/types/learning';
import { CodeLines } from '@/components/project/CodeLines';
import { langFromPath, tokenize } from '@/components/project/highlight';

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

/** `src/a.ts:10-20` → CodeRef, or null. Accepts en dashes from prose. */
export function parseRef(text: string): CodeRef | null {
  const m = text.trim().match(/^([\w@.\-/[\]()]+\.[\w]+):(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!m) return null;
  const a = Number(m[2]);
  const b = m[3] ? Number(m[3]) : a;
  return { path: m[1], startLine: Math.min(a, b), endLine: Math.max(a, b) };
}

/** Mono chip for a code reference; clicking opens the Files tab at that path. */
export function CodeRefChip({
  codeRef,
  onOpen,
  active,
  size = 'md',
}: {
  codeRef: CodeRef;
  onOpen?: (r: CodeRef) => void;
  active?: boolean;
  size?: 'sm' | 'md';
}) {
  const label = refLabel(codeRef);
  const name = codeRef.path.split('/').pop();
  const lines = codeRef.startLine === codeRef.endLine ? `${codeRef.startLine}` : `${codeRef.startLine}-${codeRef.endLine}`;
  const cls = cn(
    'group inline-flex items-center gap-1.5 max-w-full font-mono rounded-full border transition-colors duration-150 align-baseline',
    size === 'sm' ? 'text-[11.5px] h-6 px-2' : 'text-[12px] h-7 px-2.5',
    active
      ? 'border-[#B9D84A] bg-lime text-ink'
      : 'border-line bg-sheet text-ink-2 hover:border-[#B9D84A] hover:bg-lime-soft hover:text-ink'
  );
  const inner = (
    <>
      <FileCode className={cn('shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5', active ? 'text-ink' : 'text-muted group-hover:text-ink')} aria-hidden="true" />
      <span className="truncate">
        <span className="text-ink font-medium">{name}</span>
        <span className="text-muted">:{lines}</span>
      </span>
    </>
  );
  if (onOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(codeRef)}
        className={cn(cls, 'cursor-pointer')}
        title={`Open ${label}`}
        aria-label={`Open ${label}`}
        aria-pressed={active}
      >
        {inner}
      </button>
    );
  }
  return (
    <a
      href={`?tab=files&path=${encodeURIComponent(codeRef.path)}&lines=${codeRef.startLine}-${codeRef.endLine}`}
      className={cls}
      title={`Open ${label}`}
    >
      {inner}
    </a>
  );
}

const CITE_RE = /\[\[([a-zA-Z0-9_\-./]+):(\d+)(?:-(\d+))?\]\]/g;
const CITE_HREF = '#cite=';

/** Turns tutor citation tokens `[[path:1-2]]` into markdown links the renderer turns into chips. */
function linkCitations(md: string) {
  return md.replace(CITE_RE, (_m, path: string, a: string, b?: string) => {
    const lines = b && b !== a ? `${a}-${b}` : a;
    return `[${path}:${lines}](${CITE_HREF}${path}:${lines})`;
  });
}

/** All citation tokens in a tutor answer, de-duplicated, in order. */
export function extractCitations(md: string): CodeRef[] {
  const out: CodeRef[] = [];
  const seen = new Set<string>();
  for (const m of Array.from(md.matchAll(CITE_RE))) {
    const a = Number(m[2]);
    const b = m[3] ? Number(m[3]) : a;
    const key = `${m[1]}:${a}-${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ path: m[1], startLine: a, endLine: b });
  }
  return out;
}

function textOf(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return '';
}

/**
 * Markdown with the app's reading styles. `size="read"` = lesson body typography.
 * Fenced code is syntax-highlighted. Inline `path:line` code and tutor `[[path:line]]`
 * citations become chips that open the file when `onOpenRef` is given.
 */
export function Markdown({
  children,
  size = 'ui',
  className,
  onOpenRef,
  activeRef,
}: {
  children: string;
  size?: 'ui' | 'read';
  className?: string;
  onOpenRef?: (r: CodeRef) => void;
  activeRef?: CodeRef | null;
}) {
  const read = size === 'read';
  const source = useMemo(() => linkCitations(children), [children]);

  const components = useMemo<Components>(
    () => ({
      pre({ children: kids }) {
        const el = React.Children.toArray(kids)[0];
        const props = React.isValidElement(el) ? (el.props as { className?: string; children?: React.ReactNode }) : {};
        const lang = /language-([\w+-]+)/.exec(props.className || '')?.[1];
        const code = textOf(props.children).replace(/\n$/, '');
        return (
          <div className="my-5">
            <CodeBlock snippet={code} lang={lang} />
          </div>
        );
      },
      code({ children: kids, className: cls }) {
        const text = textOf(kids);
        const ref = !cls ? parseRef(text) : null;
        if (ref && onOpenRef) {
          return <CodeRefChip codeRef={ref} onOpen={onOpenRef} size="sm" />;
        }
        return <code className={cls}>{kids}</code>;
      },
      a({ href, children: kids }) {
        if (href?.startsWith(CITE_HREF)) {
          const ref = parseRef(href.slice(CITE_HREF.length));
          if (ref) {
            const isActive =
              !!activeRef && activeRef.path === ref.path && activeRef.startLine === ref.startLine && activeRef.endLine === ref.endLine;
            return onOpenRef ? (
              <CodeRefChip codeRef={ref} onOpen={onOpenRef} size="sm" active={isActive} />
            ) : (
              <CodeRefChip codeRef={ref} size="sm" />
            );
          }
        }
        const external = !!href && /^https?:/.test(href);
        return (
          <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
            {kids}
          </a>
        );
      },
    }),
    [onOpenRef, activeRef]
  );

  return (
    <div
      className={cn(
        'text-ink-2 break-words [&_code]:[font-variant-ligatures:none]',
        read ? 'text-[17px] leading-[1.7] max-w-[68ch]' : 'text-[15px] leading-[1.6]',
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-3 [&_ul]:my-3 [&_ol]:my-3 [&_ul]:pl-5 [&_ol]:pl-5 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:my-1 [&_li]:pl-1 [&_li::marker]:text-[#A8A39A]',
        '[&_h1]:font-serif [&_h2]:font-serif [&_h3]:font-serif [&_h1]:text-ink [&_h2]:text-ink [&_h3]:text-ink [&_h1]:font-normal [&_h2]:font-normal [&_h3]:font-normal [&_h1]:tracking-[-0.01em] [&_h2]:tracking-[-0.01em]',
        read
          ? '[&_h1]:text-[34px] [&_h2]:text-[28px] [&_h3]:text-[22px] [&_h1]:mt-10 [&_h2]:mt-10 [&_h3]:mt-7 [&_h1]:mb-3 [&_h2]:mb-3 [&_h3]:mb-2 [&_h1]:leading-tight [&_h2]:leading-tight'
          : '[&_h1]:text-[24px] [&_h2]:text-[21px] [&_h3]:text-[18px] [&_h1]:mt-4 [&_h2]:mt-4 [&_h3]:mt-3 [&_h1]:mb-2 [&_h2]:mb-2',
        '[&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-line-2 hover:[&_a]:decoration-ink [&_strong]:font-semibold [&_strong]:text-ink',
        '[&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.86em] [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-paper [&_:not(pre)>code]:border [&_:not(pre)>code]:border-line [&_:not(pre)>code]:text-ink',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-[#B9D84A] [&_blockquote]:pl-4 [&_blockquote]:text-muted',
        '[&_table]:w-full [&_table]:text-[14px] [&_table]:my-4 [&_th]:text-left [&_th]:font-semibold [&_th]:border-b [&_th]:border-line [&_th]:py-2 [&_td]:border-b [&_td]:border-line [&_td]:py-2 [&_th]:pr-3 [&_td]:pr-3',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Light, syntax-highlighted code block with line numbers starting at `startLine`.
 * `onOpen` adds an "Open file" action; `onLineClick` makes line numbers clickable.
 */
export function CodeBlock({
  snippet,
  startLine = 1,
  path,
  lang,
  codeRef,
  onOpen,
  highlight,
  onLineClick,
  lineLabel,
  caption,
}: {
  snippet: string;
  startLine?: number;
  /** Caption shown in the header (usually `path:start-end`). */
  path?: string;
  /** Fence language (`ts`, `py`…) when there is no path. */
  lang?: string;
  codeRef?: CodeRef;
  onOpen?: (r: CodeRef) => void;
  highlight?: [number, number] | null;
  onLineClick?: (line: number) => void;
  lineLabel?: (line: number) => string;
  caption?: React.ReactNode;
}) {
  const filePath = codeRef?.path || path?.replace(/:\d+(-\d+)?$/, '');
  const tokens = useMemo(
    () => tokenize(snippet.replace(/\n$/, ''), langFromPath(filePath, lang)),
    [snippet, filePath, lang]
  );
  const header = path || (codeRef ? refLabel(codeRef) : null);
  return (
    <figure className="rounded-[14px] overflow-hidden border border-line bg-sheet">
      {(header || caption || (onOpen && codeRef)) && (
        <figcaption className="flex items-center gap-2 px-4 h-10 border-b border-line bg-paper-2">
          <FileCode className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden="true" />
          <span className="font-mono text-[12px] text-ink-2 truncate min-w-0">{header}</span>
          {caption && <span className="text-[12px] text-muted shrink-0">{caption}</span>}
          {onOpen && codeRef && (
            <button
              type="button"
              onClick={() => onOpen(codeRef)}
              className="ml-auto shrink-0 inline-flex items-center gap-1 h-7 px-2.5 -mr-1.5 rounded-full text-[12.5px] font-medium text-ink-2 hover:bg-sheet hover:text-ink transition-colors duration-150 cursor-pointer"
            >
              Open file
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </figcaption>
      )}
      <div className="overflow-x-auto py-2.5">
        <CodeLines
          lines={tokens}
          startLine={startLine}
          highlight={highlight}
          onLineClick={onLineClick ? (n) => onLineClick(n) : undefined}
          lineLabel={lineLabel}
        />
      </div>
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
  icon,
}: {
  title: string;
  em?: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  tone?: 'default' | 'error';
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn('pj-card px-6 py-12 sm:px-12 sm:py-16 text-center', tone === 'error' && 'border-[#F5CFCF]')}>
      {icon && (
        <div
          aria-hidden="true"
          className={cn(
            'mx-auto mb-5 w-12 h-12 rounded-full grid place-items-center border',
            tone === 'error' ? 'bg-[#FDF1F1] border-[#F5CFCF] text-[#B4232C]' : 'bg-paper-2 border-line text-ink-2'
          )}
        >
          {icon}
        </div>
      )}
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

/** Thin progress bar used across the learning tabs. */
export function Bar({
  value,
  className,
  tone = 'ink',
  label,
}: {
  value: number; // 0..100
  className?: string;
  tone?: 'ink' | 'pass' | 'warn' | 'lime';
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('h-[4px] bg-line rounded-full overflow-hidden', className)}
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? Math.round(pct) : undefined}
      aria-hidden={label ? undefined : true}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300 ease-land',
          tone === 'pass' ? 'bg-pass' : tone === 'warn' ? 'bg-warn' : tone === 'lime' ? 'bg-[#9DBF2E]' : 'bg-ink'
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function GenerationProgress({
  progress,
  detail,
  label,
  steps,
}: {
  progress: number;
  detail: string | null;
  label: string;
  /** Optional plain-language list of what happens, shown under the bar. */
  steps?: string[];
}) {
  const pct = Math.round(Math.max(0, Math.min(1, progress || 0)) * 100);
  const activeStep = steps ? Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length)) : -1;
  return (
    <div className="pj-card p-6 sm:p-10" aria-live="polite">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="pj-display text-[clamp(28px,3vw,36px)] inline-flex items-center gap-3">
          <Spinner className="w-5 h-5 text-muted" />
          {label}
        </h3>
        <span className="font-serif text-[34px] leading-none tabular-nums">{pct}%</span>
      </div>
      <div
        className="mt-5 h-[4px] bg-line rounded-full overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
      >
        <div className="h-full bg-ink rounded-full transition-[width] duration-300 ease-land" style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
      <p className="mt-3 text-[14px] text-muted min-h-[1.5em]">{detail || 'Starting…'}</p>
      {steps && (
        <ol className="mt-6 grid gap-2 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s}
              className={cn(
                'flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] border text-[13.5px]',
                i < activeStep ? 'border-line bg-paper-2 text-muted' : i === activeStep ? 'border-ink bg-sheet text-ink' : 'border-line text-muted'
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'w-5 h-5 shrink-0 rounded-full grid place-items-center text-[11px] tabular-nums border',
                  i < activeStep ? 'bg-[#E6F5D0] border-[#CFE6AE] text-[#3F6212]' : i === activeStep ? 'bg-lime border-[#B9D84A] text-ink' : 'border-line-2'
                )}
              >
                {i < activeStep ? '✓' : i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Body text for a failed GET: a 404 message stands alone, other errors get a retry hint. */
export function loadErrorText(e: unknown, fallback: string) {
  if (e instanceof ApiError && (e.status === 404 || e.status === 503)) return e.message;
  return `${e instanceof Error ? e.message : fallback} Check your connection, then try again.`;
}
