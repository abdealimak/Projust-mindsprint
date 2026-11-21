'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Paperclip, Mic, BookOpen } from 'lucide-react';

export function PromptBar() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    router.push(`/tutor?q=${encodeURIComponent(prompt.trim())}`);
  };

  const handleQuickPrompt = (text: string) => {
    setPrompt(text);
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161a26] shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition p-3.5"
      >
        {/* Input & Send Button */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask anything about your codebase, viva defense, or paste a GitHub repo URL..."
            className="flex-1 bg-transparent border-none text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="w-8 h-8 rounded-xl bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center transition disabled:opacity-30 cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Toolbar row inside input box */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => router.push('/projects/new')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-medium transition cursor-pointer"
            >
              <Paperclip className="w-3 h-3 text-neutral-400" />
              <span>Attach Repo</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickPrompt('Start a 5-minute oral viva on my system architecture and failure recovery.')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-medium transition cursor-pointer"
            >
              <Mic className="w-3 h-3 text-neutral-400" />
              <span>Voice Viva</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickPrompt('What are the potential concurrency bottlenecks in my background worker pipeline?')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-medium transition cursor-pointer"
            >
              <BookOpen className="w-3 h-3 text-neutral-400" />
              <span className="hidden sm:inline">Browse Prompts</span>
              <span className="sm:hidden">Prompts</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-neutral-400">
            {prompt.length}/3,000
          </div>
        </div>
      </form>

      <p className="text-[11px] text-center text-neutral-400 dark:text-neutral-500 mt-3">
        Projust AI generates verifiable evaluation rubrics based on real commit history and code AST.
      </p>
    </div>
  );
}
