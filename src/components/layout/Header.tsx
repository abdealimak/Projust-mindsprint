import React from 'react';
import Link from 'next/link';
import { ProjustLogo } from '@/components/ui/Logo';

/**
 * Header for public pages (profiles, certificate verification).
 * Plain paper bar, no blur. `signedIn` swaps the right-hand action.
 */
export function Header({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="w-full border-b border-line bg-paper">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-10 h-16 flex items-center justify-between gap-4">
        {/* Plain <a>: "/" is the static landing page, not a Next route */}
        <a href="/" className="rounded-md" aria-label="Projust home">
          <ProjustLogo />
        </a>
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/dashboard" className="pj-btn pj-btn-ghost !min-h-[36px] !px-4 text-[13.5px]">
              Open dashboard
            </Link>
          ) : (
            <Link href="/login" className="pj-btn !min-h-[36px] !px-4 text-[13.5px]">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
