'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  MessagesSquare,
  FolderGit2,
  BookOpen,
  Award,
  Compass,
  Briefcase,
  Settings,
  Search,
  LogOut,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Misc';
import { ProjustLogo } from '@/components/ui/Logo';
import { Profile } from '@/types';
import { signOut } from '@/lib/firebase/auth';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  profile: Profile;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenSearch?: () => void;
}

export function AppSidebar({ profile, isOpen = true, onClose, onOpenSearch }: AppSidebarProps) {
  const pathname = usePathname();

  const handleSignOut = async () => {
    document.cookie = 'projust_mock_user=; path=/; max-age=0';
    try {
      await signOut();
    } catch {
      // Ignore
    }
    window.location.href = '/login';
  };

  const sections: { label: string; items: { name: string; href: string; icon: typeof LayoutGrid; active: boolean; tag?: string }[] }[] = [
    {
      label: 'Learn',
      items: [
        { name: 'Home', href: '/dashboard', icon: LayoutGrid, active: pathname === '/dashboard' },
        { name: 'Projects', href: '/projects', icon: FolderGit2, active: pathname.startsWith('/projects') },
        { name: 'Tutor', href: '/tutor', icon: MessagesSquare, active: pathname.startsWith('/tutor') },
        { name: 'Courses & quizzes', href: '/courses', icon: BookOpen, active: pathname.startsWith('/courses') },
      ],
    },
    {
      label: 'Prove',
      items: [
        { name: 'Certificates', href: '/certificates', icon: Award, active: pathname.startsWith('/certificates') || pathname.startsWith('/cert') },
        { name: 'Explore', href: '/explore', icon: Compass, active: pathname.startsWith('/explore') },
        { name: 'Jobs', href: '/jobs', icon: Briefcase, active: pathname.startsWith('/jobs'), tag: 'Preview' },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'fixed lg:static top-0 left-0 z-40 h-screen w-[248px] flex flex-col border-r border-line bg-paper transition-transform duration-300 ease-land',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="flex flex-col px-4 pt-5 pb-4 flex-1 overflow-y-auto">
        <Link href="/dashboard" onClick={onClose} className="px-2 mb-6 self-start" aria-label="Projust home">
          <ProjustLogo />
        </Link>

        <button
          type="button"
          onClick={() => {
            onClose?.();
            onOpenSearch?.();
          }}
          className="mb-6 flex items-center gap-2.5 h-10 px-3.5 rounded-full bg-sheet border border-line text-[13.5px] text-muted hover:border-line-2 hover:text-ink transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="font-mono text-[11px] text-muted px-1.5 py-0.5 rounded-md bg-paper border border-line">⌘K</kbd>
        </button>

        <nav className="flex flex-col gap-6" aria-label="Main">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="px-3 mb-2 font-mono text-[11px] tracking-[.12em] uppercase text-muted">
                {section.label}
              </div>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={item.active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-3 h-10 px-3.5 rounded-full text-[14px] font-medium transition-colors duration-200',
                          item.active
                            ? 'bg-olive text-[#F6F8EC] shadow-pill'
                            : 'text-ink-2 hover:bg-sheet'
                        )}
                      >
                        <Icon className={cn('w-[17px] h-[17px]', item.active ? 'text-[#F6F8EC]' : 'text-muted')} strokeWidth={1.8} />
                        <span className="flex-1">{item.name}</span>
                        {item.tag && (
                          <span
                            className={cn(
                              'font-mono text-[10px] px-2 py-0.5 rounded-full',
                              item.active ? 'bg-white/15 text-[#F6F8EC]' : 'bg-sheet border border-line text-muted'
                            )}
                          >
                            {item.tag}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-line space-y-1">
        <Link
          href="/settings"
          onClick={onClose}
          aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 h-10 px-3.5 rounded-full text-[14px] font-medium transition-colors',
            pathname.startsWith('/settings') ? 'bg-olive text-[#F6F8EC] shadow-pill' : 'text-ink-2 hover:bg-sheet'
          )}
        >
          <Settings className={cn('w-[17px] h-[17px]', pathname.startsWith('/settings') ? 'text-[#F6F8EC]' : 'text-muted')} strokeWidth={1.8} />
          Settings
        </Link>

        <div className="flex items-center gap-3 p-2 pr-1.5 mt-2 rounded-2xl bg-sheet border border-line">
          <Avatar src={profile.avatar_url} fallback={profile.full_name || profile.username} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold truncate">{profile.full_name || profile.username}</div>
            <div className="text-[12px] text-muted truncate">@{profile.username}</div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="w-9 h-9 grid place-items-center rounded-full text-muted hover:text-ink hover:bg-paper transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
