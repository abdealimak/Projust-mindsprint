'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  FolderGit2,
  BookOpen,
  Award,
  Compass,
  Clock,
  Settings,
  HelpCircle,
  Search,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { useTheme } from '@/components/layout/ThemeProvider';
import { Avatar } from '@/components/ui/Misc';
import { Profile } from '@/types';
import { signOut } from '@/lib/firebase/auth';

interface AppSidebarProps {
  profile: Profile;
  isOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ profile, isOpen = true, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    // Clear demo cookie if present
    document.cookie = 'projust_mock_user=; path=/; max-age=0';
    try {
      await signOut();
    } catch {
      // Ignore
    }
    window.location.href = '/login';
  };

  const navItems = [
    { name: 'AI Viva / Chat', href: '/dashboard', icon: Sparkles, active: pathname === '/dashboard' || pathname === '/tutor' },
    { name: 'Projects', href: '/projects', icon: FolderGit2, active: pathname.startsWith('/projects') },
    { name: 'Courses & Quizzes', href: '/courses', icon: BookOpen, active: pathname.startsWith('/courses') },
    { name: 'Certificates', href: '/certificates', icon: Award, active: pathname.startsWith('/certificates') || pathname.startsWith('/cert') },
    { name: 'Community', href: '/explore', icon: Compass, badge: 'NEW', active: pathname.startsWith('/explore') },
    { name: 'History & Activity', href: '/dashboard#activity', icon: Clock, active: false },
  ];

  const secondaryNavItems = [
    { name: 'Settings', href: '/settings', icon: Settings, active: pathname.startsWith('/settings') },
    { name: 'Help & Docs', href: 'https://github.com', icon: HelpCircle, external: true },
  ];

  return (
    <aside
      className={`fixed lg:static top-0 left-0 z-40 h-screen w-64 flex flex-col justify-between border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0f121a] transition-transform duration-200 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Top Section */}
      <div className="flex flex-col p-4 flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 mb-2">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            {/* Minimalist Geometric Logo Mark */}
            <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold shadow-xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M7 17L17 7M17 7H9M17 7V15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-semibold text-base tracking-tight text-neutral-900 dark:text-white">
              Projust
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              v1.0
            </span>
          </div>
        </div>

        {/* Search Bar (⌘K) */}
        <div className="relative mb-5">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              readOnly
              onClick={() => alert('Search palette (⌘K) coming soon!')}
              placeholder="Search..."
              className="w-full pl-9 pr-10 py-1.5 rounded-xl bg-neutral-50 dark:bg-[#161a26] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#1a2030] transition"
            />
            <span className="absolute right-2.5 text-[10px] font-mono text-neutral-400 bg-white dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
              ⌘K
            </span>
          </div>
        </div>

        {/* Primary Nav List */}
        <div className="space-y-1 mb-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                  item.active
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#161a26] hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${item.active ? 'text-white dark:text-neutral-900' : 'text-neutral-500'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Secondary Nav / Settings & Help */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
          <div className="px-3 mb-2 text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
            Settings & Help
          </div>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                target={item.external ? '_blank' : undefined}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                  item.active
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#161a26] hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-neutral-400" />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls & User Profile */}
      <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3 bg-neutral-50/50 dark:bg-[#0c0e14]/50">
        {/* Segmented Light/Dark Mode Switch (Script.io style) */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-neutral-200/60 dark:bg-[#161a26] border border-neutral-200/80 dark:border-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#222838] text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#161a26] border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              src={profile.avatar_url}
              fallback={profile.full_name || profile.username}
              size="sm"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                {profile.full_name || profile.username}
              </div>
              <div className="text-[10px] text-neutral-400 truncate">
                {profile.email || `${profile.username}@projust.dev`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
