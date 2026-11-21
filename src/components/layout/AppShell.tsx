'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { SearchPalette } from '@/components/layout/SearchPalette';
import { Profile } from '@/types';
import { cn } from '@/lib/utils';

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSidebarOpen(false);
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close the phone drawer on navigation and with Escape.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  return (
    <div className="h-[100dvh] overflow-clip bg-paper text-ink flex flex-row">
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-full focus:bg-ink focus:text-paper focus:text-[14px]"
      >
        Skip to content
      </a>

      <div
        className={cn(
          'fixed inset-0 bg-ink/30 z-30 lg:hidden transition-opacity duration-200 ease-land motion-reduce:transition-none',
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeSidebar}
        aria-hidden
      />

      <AppSidebar
        profile={profile}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-clip">
        <AppHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <main id="app-main" tabIndex={-1} className="flex-1 overflow-y-auto overflow-x-hidden focus:outline-none">
          {children}
        </main>
      </div>

      <SearchPalette isOpen={searchOpen} onClose={closeSearch} />
    </div>
  );
}
