import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-border py-6 px-4 mt-auto bg-canvas">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-fg-muted">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-fg">Projust</span>
          <span>&copy; {new Date().getFullYear()} Projust, Inc. Justice for honest builders.</span>
        </div>

        <nav className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-accent transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-accent transition-colors">
            Privacy
          </Link>
          <Link href="/docs" className="hover:text-accent transition-colors">
            Docs
          </Link>
          <Link href="/contact" className="hover:text-accent transition-colors">
            Contact
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-accent transition-colors"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
