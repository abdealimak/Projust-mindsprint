'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Plus, Search } from 'lucide-react';
import { ProjustLogo } from '@/components/ui/Logo';

interface AppHeaderProps {
  onToggleSidebar?: () => void;
  onOpenSearch?: () => void;
  sidebarOpen?: boolean;
}

const TITLES: [string, string][] = [
  ['/dashboard', 'Home'],
  ['/projects/new', 'Import a repository'],
  ['/projects', 'Projects'],
  ['/tutor', 'Tutor'],
  ['/courses', 'Courses & quizzes'],
  ['/certificates', 'Certificates'],
  ['/explore', 'Explore'],
  ['/jobs', 'Jobs'],
  ['/settings', 'Settings'],
];

/** Top bar: menu + logo on phones, the current section on desktop, search and Import on the right. */
export function AppHeader({ onToggleSidebar, onOpenSearch, sidebarOpen }: AppHeaderProps) {
  const pathname = usePathname();
  const title = TITLES.find(([p]) => pathname === p || pathname.startsWith(p + '/'))?.[1] ?? '';
  const onImport = pathname === '/projects/new';

  return (
    <header className="h-14 sm:h-16 shrink-0 border-b border-line bg-paper/95 px-3 sm:px-8 flex items-center justify-between gap-3 sticky top-0 z-20">
      <div className="flex items-center gap-2.5 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
            className="w-10 h-10 grid place-items-center rounded-full border border-line bg-sheet text-ink lg:hidden"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <Link href="/dashboard" className="lg:hidden" aria-label="Projust home">
          <ProjustLogo className="text-[19px]" />
        </Link>
        {title && (
          <p className="hidden lg:flex items-center gap-2 text-[14px] text-muted truncate">
            <span className="text-ink font-medium">{title}</span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search"
            className="w-10 h-10 grid place-items-center rounded-full border border-line bg-sheet text-muted hover:text-ink transition-colors lg:hidden"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
        {!onImport && (
          <Link href="/projects/new" className="pj-btn pj-btn-olive min-h-[40px] px-4 text-[14px]">
            <Plus className="w-4 h-4" aria-hidden />
            <span className="hidden sm:inline">Import repo</span>
            <span className="sm:hidden">Import</span>
          </Link>
        )}
      </div>
    </header>
  );
}
