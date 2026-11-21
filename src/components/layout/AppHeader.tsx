'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Plus } from 'lucide-react';
import { ProjustLogo } from '@/components/ui/Logo';

interface AppHeaderProps {
  onToggleSidebar?: () => void;
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

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const pathname = usePathname();
  const title = TITLES.find(([p]) => pathname === p || pathname.startsWith(p + '/'))?.[1] ?? '';

  return (
    <header className="h-16 shrink-0 border-b border-line bg-paper px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Open menu"
            className="w-10 h-10 grid place-items-center rounded-full border border-line bg-sheet lg:hidden"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <span className="lg:hidden">
          <ProjustLogo className="text-[19px]" />
        </span>
        <h1 className="hidden lg:block text-[15px] font-medium text-ink-2 truncate">{title}</h1>
      </div>

      <Link href="/projects/new" className="pj-btn pj-btn-olive min-h-[40px] text-[14px]">
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Import repo</span>
        <span className="sm:hidden">Import</span>
      </Link>
    </header>
  );
}
