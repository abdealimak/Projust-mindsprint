'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SearchIcon,
  RepoIcon,
  BookIcon,
  PersonIcon,
  XIcon,
} from '@primer/octicons-react';

interface SearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchPalette({ isOpen, onClose }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const mockResults = [
    { type: 'project', title: 'alexchen-dev/shop-api', href: '/projects', meta: 'High-throughput Node.js checkout' },
    { type: 'project', title: 'alexchen-dev/todo-app', href: '/projects', meta: 'Realtime task manager' },
    { type: 'course', title: 'Payments & Idempotency in High-Concurrence', href: '/courses', meta: 'shop-api course' },
    { type: 'person', title: 'Alex Chen (@alexchen)', href: '/u/alexchen', meta: 'Verified profile' },
    { type: 'nav', title: 'Certificates repository', href: '/certificates', meta: 'View all verified credentials' },
    { type: 'nav', title: 'AI Tutor Chat', href: '/tutor', meta: 'Ask questions grounded in your repo' },
  ];

  const filtered = query.trim()
    ? mockResults.filter(
        (r) =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.meta.toLowerCase().includes(query.toLowerCase())
      )
    : mockResults;

  const handleSelect = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-xl bg-canvas-subtle border border-border rounded-[8px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input bar */}
        <div className="flex items-center px-4 py-3 border-b border-border gap-2.5 bg-canvas">
          <SearchIcon className="text-fg-muted w-4 h-4 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or jump to projects, courses, people…"
            className="w-full bg-transparent text-[14px] text-fg placeholder:text-fg-muted focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-fg-muted hover:text-fg p-1 rounded hover:bg-canvas-subtle"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-fg-muted text-[13px]">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelect(item.href)}
                className="flex items-center justify-between px-3 py-2 rounded-[6px] hover:bg-canvas-inset hover:border-border cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-fg-muted group-hover:text-accent">
                    {item.type === 'project' && <RepoIcon className="w-4 h-4" />}
                    {item.type === 'course' && <BookIcon className="w-4 h-4" />}
                    {item.type === 'person' && <PersonIcon className="w-4 h-4" />}
                    {item.type === 'nav' && <SearchIcon className="w-4 h-4" />}
                  </span>
                  <div>
                    <div className="text-[13px] font-medium text-fg group-hover:text-accent">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-fg-muted">{item.meta}</div>
                  </div>
                </div>
                <span className="text-[11px] text-fg-muted opacity-0 group-hover:opacity-100 font-mono">
                  Jump to &rarr;
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-canvas text-[11px] text-fg-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-canvas-subtle">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-canvas-subtle">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-canvas-subtle">esc</kbd> to close
            </span>
          </div>
          <span>Projust Command Palette</span>
        </div>
      </div>
    </div>
  );
}
