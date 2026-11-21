'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  RepoIcon,
  BookIcon,
  TrophyIcon,
  CommentDiscussionIcon,
  GlobeIcon,
  BriefcaseIcon,
  GearIcon,
  XIcon,
} from '@primer/octicons-react';
import { ProjustWordmark } from '@/components/ui/Logo';

interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavDrawer({ isOpen, onClose }: NavDrawerProps) {
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const mainNav = [
    { label: 'Home', href: '/dashboard', icon: HomeIcon },
    { label: 'Projects', href: '/projects', icon: RepoIcon },
    { label: 'Courses', href: '/courses', icon: BookIcon },
    { label: 'Certificates', href: '/certificates', icon: TrophyIcon },
    { label: 'Tutor', href: '/tutor', icon: CommentDiscussionIcon },
    { label: 'Explore', href: '/explore', icon: GlobeIcon },
    { label: 'Jobs', href: '/jobs', icon: BriefcaseIcon },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer (GitHub style) */}
      <aside className="relative w-72 max-w-[80vw] bg-canvas-subtle border-r border-border h-full flex flex-col z-10 shadow-2xl animate-slideRight">
        {/* Top brand header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <ProjustWordmark />
          <button
            onClick={onClose}
            className="p-1 rounded text-fg-muted hover:text-fg hover:bg-canvas"
            aria-label="Close navigation"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'text-fg bg-canvas-inset'
                    : 'text-fg-muted hover:text-fg hover:bg-canvas'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-accent rounded-r" />
                )}
                <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-fg-muted'}`} />
                {item.label}
              </Link>
            );
          })}

          <div className="my-2 border-t border-border pt-2">
            <Link
              href="/settings"
              onClick={onClose}
              className={`relative flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-colors ${
                pathname.startsWith('/settings')
                  ? 'text-fg bg-canvas-inset'
                  : 'text-fg-muted hover:text-fg hover:bg-canvas'
              }`}
            >
              {pathname.startsWith('/settings') && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-accent rounded-r" />
              )}
              <GearIcon className="w-4 h-4 text-fg-muted" />
              Settings
            </Link>
          </div>
        </div>

        {/* Drawer footer */}
        <div className="p-4 border-t border-border text-[11px] text-fg-muted">
          <p>© 2026 Projust</p>
          <div className="flex gap-2 mt-1">
            <Link href="/terms" className="hover:text-accent">Terms</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-accent">Privacy</Link>
            <span>·</span>
            <Link href="/docs" className="hover:text-accent">Docs</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
