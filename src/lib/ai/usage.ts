import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient } from '@/lib/supabase/server';

/**
 * Token usage per project. Brain jobs run inside `withUsage({ projectId, step }, fn)`; every
 * Claude reply inside it is saved to `ai_usage` (migration 004). Fire and forget: a failed
 * insert never breaks the AI step.
 */
type Ctx = { projectId: string; step: string };
const store = new AsyncLocalStorage<Ctx>();

export function withUsage<T>(ctx: Ctx, fn: () => Promise<T>): Promise<T> {
  return store.run(ctx, fn);
}

/** Same, for code that returns synchronously (a streaming Response started inside it). */
export function withUsageSync<T>(ctx: Ctx, fn: () => T): T {
  return store.run(ctx, fn);
}

export type UsageNumbers = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export function recordUsage(model: string, usage: UsageNumbers | null | undefined, stepOverride?: string) {
  const ctx = store.getStore();
  if (!ctx || !usage) return;
  const row = {
    project_id: ctx.projectId,
    step: stepOverride || ctx.step,
    model,
    input_tokens: usage.input_tokens ?? 0,
    output_tokens: usage.output_tokens ?? 0,
    cache_read_tokens: usage.cache_read_input_tokens ?? 0,
    cache_write_tokens: usage.cache_creation_input_tokens ?? 0,
  };
  void Promise.resolve()
    .then(() => createClient().from('ai_usage').insert(row))
    .then((res) => {
      if (res?.error) console.warn('[ai] usage not saved:', res.error.message);
    })
    .catch((err) => console.warn('[ai] usage not saved:', err instanceof Error ? err.message : err));
}
