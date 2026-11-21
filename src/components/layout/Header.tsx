'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SearchIcon,
  PlusIcon,
  BellIcon,
  RepoIcon,
  BookIcon,
  TrophyIcon,
  CommentDiscussionIcon,
  GlobeIcon,
  BriefcaseIcon,
  ThreeBarsIcon,
} from '@primer/octicons-react';
import { ProjustWordmark } from '@/components/ui/Logo';
import { UserMenu } from '@/components/layout/UserMenu';
import { NavDrawer } from '@/components/layout/NavDrawer';
import { SearchPalette } from '@/components/layout/SearchPalette';
import { Profile } from '@/types';

interface HeaderProps {
  profile: Profile;
}

export function Header({ profile }: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const pathname = usePathname();

  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: RepoIcon },
    { label: 'Projects', href: '/projects', icon: RepoIcon },
    { label: 'Courses', href: '/courses', icon: BookIcon },
    { label: 'Certificates', href: '/certificates', icon: TrophyIcon },
    { label: 'Tutor', href: '/tutor', icon: CommentDiscussionIcon },
    { label: 'Explore', href: '/explore', icon: GlobeIcon },
    { label: 'Jobs', href: '/jobs', icon: BriefcaseIcon },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-canvas-subtle/80 backdrop-blur-md border-b border-border transition-colors">
        {/* Main top bar */}
        <div className="max-w-7xl mx-auto px-4 h-15 flex items-center justify-between gap-4 py-2.5">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Toggle navigation drawer"
              className="lg:hidden p-1.5 rounded-md border border-border bg-canvas text-fg-muted hover:text-fg"
            >
              <ThreeBarsIcon className="w-4 h-4" />
            </button>

            <Link href="/dashboard" className="flex items-center hover:opacity-90 transition-opacity">
              <ProjustWordmark />
            </Link>
          </div>

          {/* Center search bar */}
          <div className="flex-1 max-w-md hidden sm:block">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-border bg-canvas/60 hover:bg-canvas text-fg-muted hover:text-fg text-[13px] transition-all shadow-inner focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <span className="flex items-center gap-2">
                <SearchIcon className="w-3.5 h-3.5 text-accent" />
                <span>Search projects, concepts, certificates…</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono border border-border rounded bg-canvas-subtle text-fg-muted">
                /
              </kbd>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            {/* Quick Import Project Button */}
            <Link href="/projects/new" className="hidden sm:inline-flex">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium bg-accent text-slate-950 font-semibold hover:bg-accent-hover transition-colors shadow-sm">
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Import Project</span>
              </button>
            </Link>

            {/* Mobile search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="sm:hidden p-1.5 rounded-md border border-border text-fg-muted hover:text-fg"
            >
              <SearchIcon className="w-4 h-4" />
            </button>

            {/* Notifications */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(!bellOpen)}
                aria-label="Notifications"
                className="relative p-2 rounded-md border border-border bg-canvas/50 hover:bg-canvas text-fg-muted hover:text-fg transition-colors"
              >
                <BellIcon className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full ring-2 ring-canvas-subtle animate-pulse" />
              </button>

              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-canvas-subtle shadow-2xl py-1 z-50 text-[13px] animate-fadeIn">
                  <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between">
                    <span className="font-semibold text-fg">Notifications</span>
                    <span className="text-[11px] text-accent hover:underline cursor-pointer">
                      Mark read
                    </span>
                  </div>
                  <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
                    <div className="p-3 hover:bg-canvas-inset transition-colors cursor-pointer">
                      <p className="text-[12px] font-medium text-fg">
                        Certificate PJ-2026-A7X9K2 unlocked
                      </p>
                      <p className="text-[11px] text-fg-muted mt-0.5">
                        Your scores for shop-api passed the certification threshold.
                      </p>
                      <span className="text-[10px] text-fg-muted font-mono mt-1 block">2h ago</span>
                    </div>
                    <div className="p-3 hover:bg-canvas-inset transition-colors cursor-pointer">
                      <p className="text-[12px] font-medium text-fg">
                        New quiz available: Webhooks & Signatures
                      </p>
                      <p className="text-[11px] text-fg-muted mt-0.5">
                        Test your comprehension of idempotency keys.
                      </p>
                      <span className="text-[10px] text-fg-muted font-mono mt-1 block">5h ago</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <UserMenu profile={profile} />
          </div>
        </div>

        {/* Clean horizontal navigation tabs */}
        <div className="hidden lg:block border-t border-border/60 bg-canvas/30">
          <nav className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-canvas-subtle text-accent border border-border shadow-xs'
                      : 'text-fg-muted hover:text-fg hover:bg-canvas-subtle/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-accent' : 'text-fg-muted'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Slide-over navigation drawer for mobile */}
      <NavDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Search Command Palette */}
      <SearchPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
