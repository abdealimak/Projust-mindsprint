'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, GitBranch } from 'lucide-react';

const SUGGESTIONS = [
  'How does authentication work in my project?',
  'Where could a race condition happen?',
  'Explain my database schema',
];

const MAX = 3000;

export function PromptBar() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = prompt.trim();
    if (!q) return;
    // A pasted GitHub link goes straight to import.
    if (/^https?:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s]+/i.test(q)) {
      router.push(`/projects/new?url=${encodeURIComponent(q)}`);
      return;
    }
    router.push(`/tutor?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="rounded-m border border-line bg-sheet shadow-card focus-within:border-line-2 transition-colors p-2 pl-5"
      >
        <div className="flex items-center gap-3">
          <label htmlFor="pj-prompt" className="sr-only">
            Ask about your code or paste a GitHub link
          </label>
          <input
            id="pj-prompt"
            type="text"
            value={prompt}
            maxLength={MAX}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask about your code, or paste a GitHub link"
            className="flex-1 min-w-0 h-12 bg-transparent border-none text-[16px] text-ink placeholder:text-[#8F8B84] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!prompt.trim()}
            aria-label="Send"
            className="w-11 h-11 rounded-full bg-ink text-paper grid place-items-center shrink-0 transition-[transform,opacity] duration-200 ease-land hover:-translate-y-0.5 disabled:opacity-25 disabled:hover:translate-y-0"
          >
            <ArrowUp className="w-[18px] h-[18px]" />
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button
          type="button"
          onClick={() => router.push('/projects/new')}
          className="pj-chip h-8 px-3 text-[13px] text-ink-2 hover:border-line-2 transition-colors"
        >
          <GitBranch className="w-3.5 h-3.5 text-muted" />
          Import a repo
        </button>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setPrompt(s)}
            className="pj-chip h-8 px-3 text-[13px] text-ink-2 hover:border-line-2 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
