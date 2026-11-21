'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  FolderGit2,
  LayoutDashboard,
  FolderOpen,
  Plus,
  GraduationCap,
  Award,
  Settings,
  MessagesSquare,
  Compass,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProjectHit {
  id: string;
  repo_full_name: string;
  status: string;
  summary: string | null;
}

interface Item {
  key: string;
  group: 'Projects' | 'Go to';
  title: string;
  meta?: string;
  href: string;
  icon: LucideIcon;
  mono?: boolean;
}

const SHORTCUTS: Omit<Item, 'group' | 'key'>[] = [
  { title: 'Home', href: '/dashboard', icon: LayoutDashboard, meta: 'Dashboard' },
  { title: 'Import a repository', href: '/projects/new', icon: Plus, meta: 'Paste a GitHub link or pick a repo' },
  { title: 'Projects', href: '/projects', icon: FolderOpen },
  { title: 'Ask the tutor', href: '/tutor', icon: MessagesSquare, meta: 'Questions about your own code' },
  { title: 'Courses & quizzes', href: '/courses', icon: GraduationCap },
  { title: 'Certificates', href: '/certificates', icon: Award },
  { title: 'Explore practice projects', href: '/explore', icon: Compass },
  { title: 'Settings', href: '/settings', icon: Settings, meta: 'Profile, GitHub, privacy' },
];

const STATUS_LABEL: Record<string, string> = {
  ready: 'Ready',
  in_progress: 'In progress',
  completed: 'Completed',
  analyzing: 'Analyzing',
  importing: 'Importing',
  failed: 'Failed',
};

type FetchState = 'idle' | 'loading' | 'done' | 'error';

export function SearchPalette({ isOpen, onClose }: SearchPaletteProps) {
  const router = useRouter();
  const listId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [projects, setProjects] = useState<ProjectHit[]>([]);
  const [sample, setSample] = useState(false);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [active, setActive] = useState(0);

  // Reset on open, remember and restore focus.
  useEffect(() => {
    if (!isOpen) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setDebounced('');
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      restoreRef.current?.focus?.();
    };
  }, [isOpen]);

  // Keep the page behind the palette from scrolling.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Debounce input by 200ms.
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  // Fetch the user's projects for the debounced query.
  useEffect(() => {
    if (!isOpen) return;
    const ctrl = new AbortController();
    setFetchState('loading');
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { projects: ProjectHit[]; sample: boolean };
        setProjects(body.projects || []);
        setSample(!!body.sample);
        setFetchState('done');
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setProjects([]);
        setFetchState('error');
      });
    return () => ctrl.abort();
  }, [debounced, isOpen]);

  const items = useMemo<Item[]>(() => {
    const needle = query.trim().toLowerCase();
    const projectItems: Item[] = projects.map((p) => ({
      key: `p:${p.id}`,
      group: 'Projects',
      title: p.repo_full_name,
      meta: [STATUS_LABEL[p.status] || p.status, p.summary].filter(Boolean).join(' — '),
      href: `/projects/${p.id}`,
      icon: FolderGit2,
      mono: true,
    }));
    const navItems: Item[] = SHORTCUTS.filter(
      (s) =>
        !needle ||
        s.title.toLowerCase().includes(needle) ||
        (s.meta || '').toLowerCase().includes(needle)
    ).map((s) => ({ ...s, key: `n:${s.href}`, group: 'Go to' }));
    return [...projectItems, ...navItems];
  }, [projects, query]);

  useEffect(() => {
    setActive((a) => (items.length === 0 ? 0 : Math.min(a, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    setActive(0);
  }, [debounced]);

  // Keep the active option in view.
  useEffect(() => {
    const el = document.getElementById(`${listId}-opt-${active}`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, listId]);

  const select = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      onClose();
      router.push(item.href);
    },
    [onClose, router]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length) setActive((a) => (a + 1) % items.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length) setActive((a) => (a - 1 + items.length) % items.length);
      return;
    }
    if (e.key === 'Enter' && e.target === inputRef.current) {
      e.preventDefault();
      select(items[active]);
      return;
    }
    if (e.key === 'Tab') {
      // Focus trap: cycle between the focusable controls inside the dialog.
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
        'input, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (!isOpen) return null;

  const trimmed = query.trim();
  const searching = fetchState === 'loading' || trimmed !== debounced;
  const hasProjects = projects.length > 0;
  const noResults = items.length === 0 && !searching;

  let index = -1;
  const renderGroup = (group: Item['group'], heading: React.ReactNode) => {
    const groupItems = items.filter((i) => i.group === group);
    if (groupItems.length === 0) return null;
    return (
      <div role="group" aria-label={group} className="py-1.5">
        <div className="px-3 pt-1 pb-1.5 text-[12px] text-muted flex items-center gap-2">{heading}</div>
        {groupItems.map((item) => {
          index += 1;
          const i = index;
          const Icon = item.icon;
          const isActive = i === active;
          return (
            <div
              key={item.key}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={isActive}
              onMouseMove={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(item)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-s cursor-pointer',
                isActive ? 'bg-[#EEF2DF]' : 'hover:bg-paper'
              )}
            >
              <span
                className={cn(
                  'w-8 h-8 rounded-[10px] grid place-items-center shrink-0 border',
                  isActive ? 'bg-olive border-olive text-[#F6F8EC]' : 'bg-sheet border-line text-muted'
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-[14px] text-ink', item.mono && 'font-mono text-[13px]')}>
                  {item.title}
                </span>
                {item.meta && <span className="block truncate text-[12.5px] text-muted">{item.meta}</span>}
              </span>
              {isActive && <span className="hidden sm:inline text-[12px] text-muted shrink-0">Open</span>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-3 sm:px-4 pt-[8vh] sm:pt-[12vh] bg-ink/30"
      onMouseDown={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="w-full max-w-[600px] rounded-m border border-line bg-sheet shadow-lift overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
          <Search className="w-[18px] h-[18px] text-muted shrink-0" strokeWidth={1.8} aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects or jump to a page"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items.length ? `${listId}-opt-${active}` : undefined}
            aria-autocomplete="list"
            className="flex-1 min-w-0 bg-transparent text-[16px] sm:text-[15px] text-ink placeholder:text-muted focus:outline-none"
            style={{ outline: 'none' }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="w-8 h-8 grid place-items-center rounded-full text-muted hover:text-ink hover:bg-paper shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div id={listId} role="listbox" aria-label="Results" className="max-h-[min(420px,60vh)] overflow-y-auto px-2 py-1">
          {renderGroup(
            'Projects',
            <>
              <span>{trimmed ? 'Your projects' : 'Recent projects'}</span>
              {sample && (
                <span className="px-1.5 py-px rounded-full border border-line text-[11px]">Sample data</span>
              )}
            </>
          )}

          {!hasProjects && fetchState === 'done' && !trimmed && (
            <div className="mx-1 my-2 rounded-s bg-paper px-4 py-3 text-[13.5px] text-muted">
              No projects yet. Import a repository to search it here.
            </div>
          )}
          {fetchState === 'error' && (
            <div className="mx-1 my-2 rounded-s bg-paper px-4 py-3 text-[13.5px] text-muted">
              Could not search projects. Page shortcuts still work.
            </div>
          )}

          {renderGroup('Go to', <span>Go to</span>)}

          {noResults && (
            <div className="px-4 py-10 text-center">
              <p className="text-[15px] text-ink">No matches for &ldquo;{trimmed}&rdquo;</p>
              <p className="mt-1 text-[13.5px] text-muted">Search looks at repository names, like owner/repo.</p>
            </div>
          )}
          {searching && items.length === 0 && (
            <div className="px-4 py-10 text-center text-[13.5px] text-muted">Searching…</div>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-4 px-4 h-10 border-t border-line bg-paper-2 text-[12px] text-muted">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Enter</Kbd> open
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="min-w-[20px] h-5 px-1.5 inline-grid place-items-center rounded-[6px] border border-line bg-sheet font-mono text-[11px] text-ink-2">
      {children}
    </kbd>
  );
}
