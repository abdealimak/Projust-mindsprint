'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Profile } from '@/types';
import { Avatar } from '@/components/ui/Misc';
import { useTheme } from '@/components/layout/ThemeProvider';
import { createClient } from '@/lib/supabase/client';
import {
  PersonIcon,
  RepoIcon,
  TrophyIcon,
  BookIcon,
  GearIcon,
  SignOutIcon,
  SunIcon,
  MoonIcon,
} from '@primer/octicons-react';

export function UserMenu({ profile }: { profile: Profile }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    // Clear developer mock cookies as well
    document.cookie = 'projust_mock_user=; path=/; max-age=0';
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User navigation menu"
        className="flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <Avatar src={profile.avatar_url} fallback={profile.username[0]?.toUpperCase()} size="sm" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-[6px] border border-border bg-canvas-subtle shadow-xl py-1 z-50 text-[13px] animate-fadeIn">
          {/* Header */}
          <div className="px-3.5 py-2 border-b border-border">
            <p className="text-fg-muted text-[12px]">Signed in as</p>
            <p className="font-semibold text-fg truncate">@{profile.username}</p>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href={`/u/${profile.username}`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-canvas-inset text-fg"
            >
              <PersonIcon className="w-4 h-4 text-fg-muted" />
              Your profile
            </Link>
            <Link
              href="/projects"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-canvas-inset text-fg"
            >
              <RepoIcon className="w-4 h-4 text-fg-muted" />
              Your projects
            </Link>
            <Link
              href="/certificates"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-canvas-inset text-fg"
            >
              <TrophyIcon className="w-4 h-4 text-fg-muted" />
              Your certificates
            </Link>
            <Link
              href="/courses"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-canvas-inset text-fg"
            >
              <BookIcon className="w-4 h-4 text-fg-muted" />
              Your courses
            </Link>
          </div>

          <div className="border-t border-border py-1">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-canvas-inset text-fg"
            >
              <GearIcon className="w-4 h-4 text-fg-muted" />
              Settings
            </Link>
          </div>

          {/* Theme selector */}
          <div className="border-t border-border px-3.5 py-2">
            <span className="text-[11px] font-semibold text-fg-muted uppercase tracking-wider block mb-1.5">
              Appearance
            </span>
            <div className="flex items-center gap-1 bg-canvas border border-border p-0.5 rounded-[6px]">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-[4px] text-[11px] font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-canvas-subtle text-fg shadow-sm border border-border'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                <SunIcon className="w-3 h-3" /> Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-[4px] text-[11px] font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-canvas-subtle text-fg shadow-sm border border-border'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                <MoonIcon className="w-3 h-3" /> Dark
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`flex-1 flex items-center justify-center py-1 rounded-[4px] text-[11px] font-medium transition-colors ${
                  theme === 'system'
                    ? 'bg-canvas-subtle text-fg shadow-sm border border-border'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                System
              </button>
            </div>
          </div>

          {/* Sign out */}
          <div className="border-t border-border py-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left flex items-center gap-2.5 px-3.5 py-1.5 hover:bg-canvas-inset text-danger"
            >
              <SignOutIcon className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
