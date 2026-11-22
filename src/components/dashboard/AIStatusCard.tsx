import React from 'react';
import Link from 'next/link';
import { Cpu, ArrowUpRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/user';
import { readUserAI, mayUseServerAI } from '@/lib/ai/user-settings';
import { isLlmConfigured, serverAILabel } from '@/lib/ai/provider';
import { keyHint, providerInfo } from '@/lib/ai/catalog';

/** Dashboard line: which AI live runs will use, with a link to Settings → AI. No key ever reaches the page. */
export async function AIStatusCard() {
  const user = await getCurrentUser();
  if (!user || user.demo) return null;
  const mine = readUserAI(user.uid);
  const shared = mayUseServerAI(user.email) && isLlmConfigured ? serverAILabel() : null;

  const state = mine
    ? { dot: 'bg-[#4D7C0F]', text: `${providerInfo(mine.provider)?.label} · ${mine.model}`, sub: `Your key ${keyHint(mine.apiKey)}`, cta: 'Change' }
    : shared
      ? { dot: 'bg-ink-2', text: shared, sub: "Projust's shared AI", cta: 'Use your own key' }
      : { dot: 'bg-[#B42318]', text: 'No AI set up', sub: 'Add a key to run live imports, courses and quizzes', cta: 'Add your key' };

  return (
    <Link
      href="/settings?tab=ai"
      className="mt-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-sheet border border-line hover:border-ink/40 transition-colors max-w-[560px]"
    >
      <span className="w-9 h-9 rounded-xl bg-paper-2 border border-line grid place-items-center shrink-0">
        <Cpu className="w-4 h-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
          <span className={`w-2 h-2 rounded-full shrink-0 ${state.dot}`} aria-hidden />
          <span className="truncate">AI for live runs: {state.text}</span>
        </span>
        <span className="block text-[12.5px] text-muted truncate">{state.sub}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-ink shrink-0">
        {state.cta}
        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
      </span>
    </Link>
  );
}
