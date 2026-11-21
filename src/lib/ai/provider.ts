import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV4 } from '@ai-sdk/provider';

/**
 * LLM routing. Claude (./claude.ts, ANTHROPIC_API_KEY) goes first when configured; this file is the
 * fallback: an ordered chain of OpenAI-compatible backends. Server-side only; nothing about
 * which backend answered is ever sent to the browser.
 *
 *   1. AI_SERVER_*  self-hosted Projust AI server (Windows laptop, Ollama behind the gateway)
 *   2. LLM_ALT_*    any extra OpenAI-compatible backend (e.g. OpenCode Zen, Groq, Gemini compat)
 *   3. LLM_*        fallback, OpenRouter by default
 *
 * A backend that errors or doesn't send response headers in time is skipped for a cooldown
 * and the next one is tried. Errors halfway through a stream can't be retried.
 */

interface Backend {
  name: string;
  main: LanguageModelV4;
  fast: LanguageModelV4;
  downUntil: number;
  cooldownMs: number;
}

const CONNECT_TIMEOUT_MS = Number(process.env.AI_SERVER_CONNECT_TIMEOUT_MS || 8000);
const COOLDOWN_MS = Number(process.env.AI_SERVER_COOLDOWN_MS || 60000);
/** Cloud APIs fail briefly (rate limits, a busy free model), so skip them for less time. */
const CLOUD_COOLDOWN_MS = Number(process.env.LLM_COOLDOWN_MS || 10000);

export const mainModelName = process.env.LLM_MODEL || 'deepseek/deepseek-chat';
export const fastModelName = process.env.LLM_FAST_MODEL || 'deepseek/deepseek-chat';

/** Max wait for a non-streamed reply (the whole answer arrives with the headers). */
const GENERATE_TIMEOUT_MS = Number(process.env.LLM_GENERATE_TIMEOUT_MS || 300000);

/**
 * Aborts if response headers don't arrive in time.
 * Streamed calls get `timeoutMs` (headers come as soon as generation starts).
 * Non-streamed calls only send headers once the full answer is written, so they get
 * GENERATE_TIMEOUT_MS instead; otherwise long lessons would always "time out".
 */
function fetchWithConnectTimeout(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const isStream = typeof init?.body === 'string' && /"stream"\s*:\s*true/.test(init.body);
    const limitMs = isStream ? timeoutMs : Math.max(timeoutMs, GENERATE_TIMEOUT_MS);
    const controller = new AbortController();
    const outer = init?.signal;
    if (outer) {
      if (outer.aborted) controller.abort(outer.reason);
      else outer.addEventListener('abort', () => controller.abort(outer.reason), { once: true });
    }
    const timer = setTimeout(
      () => controller.abort(new Error(`no response within ${limitMs}ms`)),
      limitMs
    );
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}

function makeBackend(opts: {
  name: string;
  baseURL: string;
  apiKey: string;
  main: string;
  fast: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  cooldownMs?: number;
}): Backend {
  const provider = createOpenAI({
    name: opts.name,
    baseURL: opts.baseURL.replace(/\/+$/, ''),
    apiKey: opts.apiKey || 'none',
    headers: opts.headers,
    fetch: opts.timeoutMs ? fetchWithConnectTimeout(opts.timeoutMs) : undefined,
  });
  // chat-completions: spoken by Ollama, OpenRouter, OpenCode Zen and most compatible APIs
  return { name: opts.name, main: provider.chat(opts.main), fast: provider.chat(opts.fast), downUntil: 0, cooldownMs: opts.cooldownMs ?? CLOUD_COOLDOWN_MS };
}

const backends: Backend[] = [];

if (process.env.AI_SERVER_URL) {
  const url = process.env.AI_SERVER_URL.replace(/\/+$/, '');
  backends.push(
    makeBackend({
      name: 'primary',
      baseURL: /\/v1$/.test(url) ? url : `${url}/v1`,
      apiKey: process.env.AI_SERVER_KEY || '',
      main: process.env.AI_SERVER_MODEL || 'projust-main',
      fast: process.env.AI_SERVER_FAST_MODEL || 'projust-fast',
      timeoutMs: CONNECT_TIMEOUT_MS,
      cooldownMs: COOLDOWN_MS,
    })
  );
}

if (process.env.LLM_ALT_BASE_URL && process.env.LLM_ALT_MODEL && process.env.LLM_ALT_API_KEY) {
  backends.push(
    makeBackend({
      name: 'alt',
      baseURL: process.env.LLM_ALT_BASE_URL,
      apiKey: process.env.LLM_ALT_API_KEY || '',
      main: process.env.LLM_ALT_MODEL,
      fast: process.env.LLM_ALT_FAST_MODEL || process.env.LLM_ALT_MODEL,
      timeoutMs: Number(process.env.LLM_ALT_CONNECT_TIMEOUT_MS || 20000),
    })
  );
}

if (process.env.LLM_API_KEY || backends.length === 0) {
  backends.push(
    makeBackend({
      name: 'fallback',
      baseURL: process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1',
      apiKey: process.env.LLM_API_KEY || 'dummy_key_for_build',
      main: mainModelName,
      fast: fastModelName,
      headers: {
        // OpenRouter attribution headers (ignored elsewhere)
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Projust',
      },
    })
  );

  // Second model on the same fallback provider (e.g. OpenRouter "openrouter/free"), used when
  // the first model is rate-limited or down. Free models come and go, so a backup matters.
  if (process.env.LLM_API_KEY && process.env.LLM_BACKUP_MODEL) {
    backends.push(
      makeBackend({
        name: 'backup',
        baseURL: process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1',
        apiKey: process.env.LLM_API_KEY,
        main: process.env.LLM_BACKUP_MODEL,
        fast: process.env.LLM_BACKUP_MODEL,
        headers: {
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'Projust',
        },
      })
    );
  }
}

/** True when the brain should use fewer, larger AI calls (big-context cloud models, free-tier quotas). */
export const isBatchMode = process.env.BRAIN_BATCH === '1' || process.env.BRAIN_BATCH === 'true';

/** True when an OpenAI-compatible backend (not Claude) has credentials. */
export const hasNonClaudeBackend = Boolean(
  process.env.AI_SERVER_URL || (process.env.LLM_ALT_BASE_URL && process.env.LLM_ALT_MODEL && process.env.LLM_ALT_API_KEY) || process.env.LLM_API_KEY
);

/** True when at least one backend has credentials: Claude (./claude.ts) or one of the chain above. */
export const isLlmConfigured = hasNonClaudeBackend || Boolean(process.env.ANTHROPIC_API_KEY);

function chainModel(kind: 'main' | 'fast'): LanguageModelV4 {
  const first = backends[0][kind];

  async function run<T>(
    options: { abortSignal?: AbortSignal },
    call: (m: LanguageModelV4) => PromiseLike<T>
  ): Promise<T> {
    const now = Date.now();
    // Try healthy backends first; if all are cooling down, still try them in order.
    const order = [...backends.filter((b) => b.downUntil <= now), ...backends.filter((b) => b.downUntil > now)];
    let lastErr: unknown;
    for (let i = 0; i < order.length; i++) {
      const b = order[i];
      try {
        return await call(b[kind]);
      } catch (err) {
        if (options.abortSignal?.aborted) throw err;
        lastErr = err;
        if (i < order.length - 1) {
          b.downUntil = Date.now() + b.cooldownMs;
          const msg = err instanceof Error ? err.message : String(err);
          const body = (err as { responseBody?: string })?.responseBody;
          console.warn(`[ai] backend "${b.name}" failed (${msg.slice(0, 160)}${body ? ` | ${String(body).slice(0, 200)}` : ''}); trying next`);
        }
      }
    }
    throw lastErr;
  }

  return {
    specificationVersion: 'v4',
    provider: 'projust',
    modelId: first.modelId,
    supportedUrls: {},
    doGenerate: (options) => run(options, (m) => m.doGenerate(options)),
    doStream: (options) => run(options, (m) => m.doStream(options)),
  };
}

export const llmModel = chainModel('main');
export const llmFastModel = chainModel('fast');

/** Server-side diagnostics only. */
export function llmBackendNames(): string[] {
  return backends.map((b) => b.name);
}
