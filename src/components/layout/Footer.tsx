import React from 'react';
import Link from 'next/link';
import { ProjustLogo } from '@/components/ui/Logo';

/** Footer for public pages. Only links to pages that exist. */
export function Footer() {
  return (
    <footer className="w-full border-t border-line bg-paper mt-auto">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-10 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[13.5px] text-muted">
        <div className="flex items-center gap-3">
          <ProjustLogo className="text-[17px]" />
          <span>Proof that you understand the code you ship.</span>
        </div>
        <nav className="flex items-center gap-5">
          <a href="/" className="hover:text-ink">
            Home
          </a>
          <Link href="/login" className="hover:text-ink">
            Sign in
          </Link>
          <span>&copy; {new Date().getFullYear()} Projust</span>
        </nav>
      </div>
    </footer>
  );
}
