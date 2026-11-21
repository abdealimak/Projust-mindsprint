'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'How does authentication work in my project?',
  'Where could a race condition happen?',
  'Explain my database schema',
];

const MAX = 3000;
const GITHUB_RE = /^https?:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s]+/i;

export function PromptBar() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const q = prompt.trim();
  const isRepoLink = GITHUB_RE.test(q);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q || sending) return;
    setSending(true);
    // A pasted GitHub link goes straight to import.
    if (isRepoLink) {
      router.push(`/projects/new?url=${encodeURIComponent(q)}`);
      return;
    }
    router.push(`/tutor?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="rounded-m border border-line bg-sheet shadow-card focus-within:border-ink/40 transition-colors p-2 pl-4 sm:pl-5"
      >
        <label htmlFor="pj-prompt" className="block pt-2 text-[12.5px] font-medium text-muted">
          Ask the tutor, or paste a GitHub link to import it
        </label>
        <div className="flex items-center gap-3">
          <input
            id="pj-prompt"
            type="text"
            value={prompt}
            maxLength={MAX}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (sending) setSending(false);
            }}
            placeholder="How does checkout work?"
            autoComplete="off"
            enterKeyHint="send"
            className="flex-1 min-w-0 h-11 bg-transparent border-none text-[16px] text-ink placeholder:text-[#8F8B84] focus:outline-none"
            style={{ outline: 'none' }}
          />
          <button
            type="submit"
            disabled={!q || sending}
            aria-label={isRepoLink ? 'Import this repository' : 'Ask the tutor'}
            className={cn(
              'h-11 rounded-full bg-ink text-paper inline-flex items-center justify-center gap-2 shrink-0 font-medium text-[14px]',
              'transition-[transform,opacity] duration-200 ease-land hover:-translate-y-0.5 disabled:opacity-25 disabled:hover:translate-y-0',
              isRepoLink ? 'px-4' : 'w-11'
            )}
          >
            {isRepoLink ? (
              <>
                <GitBranch className="w-4 h-4" aria-hidden />
                Import
              </>
            ) : (
              <ArrowUp className="w-[18px] h-[18px]" aria-hidden />
            )}
          </button>
        </div>
      </form>

      <div className="relative mt-3 -mx-4 sm:mx-0">
        <div className="pj-scroll-x flex sm:flex-wrap items-center gap-2 px-4 sm:px-0 pb-1">
          <button
            type="button"
            onClick={() => router.push('/projects/new')}
            className="pj-chip shrink-0 h-8 px-3 text-[13px] text-ink-2 hover:border-line-2 hover:text-ink transition-colors"
          >
            <GitBranch className="w-3.5 h-3.5 text-muted" aria-hidden />
            Import a repo
          </button>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setPrompt(s);
                document.getElementById('pj-prompt')?.focus();
              }}
              className="pj-chip shrink-0 h-8 px-3 text-[13px] text-ink-2 whitespace-nowrap hover:border-line-2 hover:text-ink transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
