'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Zap, HelpCircle, Bell } from 'lucide-react';
import { Profile } from '@/types';

interface AppHeaderProps {
  profile?: Profile;
  onToggleSidebar?: () => void;
  title?: string;
}

export function AppHeader({ onToggleSidebar, title = 'AI Viva' }: AppHeaderProps) {
  return (
    <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-[#0c0e14]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile hamburger & title */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight">
          {title}
        </h2>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {/* Upgrade / Pro button (Script.io style) */}
        <Link
          href="/pricing"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-xs font-semibold shadow-xs transition"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Upgrade</span>
        </Link>

        {/* Help icon */}
        <button
          type="button"
          onClick={() => alert('Projust Guide & Documentation')}
          className="p-1.5 rounded-full text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Notifications / Activity */}
        <button
          type="button"
          onClick={() => alert('No unread notifications')}
          className="p-1.5 rounded-full text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition relative"
        >
          <Bell className="w-4 h-4" />
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full absolute top-1.5 right-1.5" />
        </button>
      </div>
    </header>
  );
}
