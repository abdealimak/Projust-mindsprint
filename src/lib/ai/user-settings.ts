import { AsyncLocalStorage } from 'node:async_hooks';
import { cookies } from 'next/headers';
import { decryptToken, encryptToken } from '@/lib/crypto';
import { getCurrentUser } from '@/lib/auth/user';
import { keyHint, providerInfo, type ProviderId, type PublicAISettings } from './catalog';

/**
 * Per-user AI settings (Settings → AI): provider, model and the user's own API key.
 *
 * Stored in an httpOnly cookie, encrypted with AES-256-GCM (TOKEN_ENCRYPTION_KEY) and bound to
 * the signed-in user's id. The key is never sent back to the browser (only a hint like
 * "sk-ant-…9f3a"), never logged and never written to the database.
 *
 * AI work runs inside `withUserAI(fn)`, so background jobs started by a request keep using the
 * key of the user who started them.
 */
export interface UserAI {
  provider: ProviderId;
  model: string;
  baseURL: string | null;
  apiKey: string;
  savedAt: string;
}

const COOKIE = 'projust_ai';
const MAX_AGE_S = 60 * 60 * 24 * 30;

/* ── server keys: who may use them ───────────────────────────────────────── */

/**
 * SHARED_AI_ALLOWED_EMAILS controls who may run on the server's own keys (the LLM_* /
 * ANTHROPIC_API_KEY env vars):
 *   unset      → every signed-in user (fine locally, risky on a public site)
 *   "none"     → nobody; everyone brings their own key
 *   "a@x,b@y"  → only these emails
 */
export function mayUseServerAI(email: string | null | undefined): boolean {
  const raw = (process.env.SHARED_AI_ALLOWED_EMAILS || '').trim();
  if (!raw) return true;
  if (raw.toLowerCase() === 'none') return false;
  if (!email) return false;
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/* ── cookie storage ──────────────────────────────────────────────────────── */

export function readUserAI(uid: string): UserAI | null {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const data = JSON.parse(decryptToken(raw)) as UserAI & { uid: string; v: number };
    if (data.v !== 1 || data.uid !== uid || !providerInfo(data.provider) || !data.apiKey || !data.model) return null;
    return { provider: data.provider, model: data.model, baseURL: data.baseURL ?? null, apiKey: data.apiKey, savedAt: data.savedAt };
  } catch {
    return null; // tampered, old key, or another user's cookie
  }
}

export function writeUserAI(uid: string, s: Omit<UserAI, 'savedAt'>, secure: boolean): UserAI {
  const saved: UserAI = { ...s, savedAt: new Date().toISOString() };
  cookies().set(COOKIE, encryptToken(JSON.stringify({ v: 1, uid, ...saved })), {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_S,
  });
  return saved;
}

export function clearUserAI() {
  cookies().set(COOKIE, '', { path: '/', maxAge: 0 });
}

export const toPublic = (s: UserAI): PublicAISettings => ({
  provider: s.provider,
  model: s.model,
  baseURL: s.baseURL,
  keyHint: keyHint(s.apiKey),
  savedAt: s.savedAt,
});

/* ── validation ──────────────────────────────────────────────────────────── */

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[?::1\]?|\[?f[cd][0-9a-f]{2}:.*)$/i;

/**
 * A custom base URL must be a plain http(s) URL. In production it must be https and must not
 * point at a private or internal address, so a user can't make the server call internal services.
 */
export function checkBaseURL(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return 'Enter a full URL, like https://api.example.com/v1';
  }
  if (u.username || u.password) return 'Leave credentials out of the URL; put the key in the API key field.';
  const prod = process.env.NODE_ENV === 'production';
  if (prod && u.protocol !== 'https:') return 'Use an https:// URL.';
  if (!['http:', 'https:'].includes(u.protocol)) return 'Use an http(s) URL.';
  if (prod && PRIVATE_HOST.test(u.hostname)) return 'Private and local addresses are not allowed on the hosted site.';
  return null;
}

export function validateSettings(input: {
  provider?: unknown;
  model?: unknown;
  baseURL?: unknown;
  apiKey?: unknown;
}): { ok: true; value: Omit<UserAI, 'savedAt'> } | { ok: false; error: string } {
  const info = typeof input.provider === 'string' ? providerInfo(input.provider) : undefined;
  if (!info) return { ok: false, error: 'Pick a provider.' };
  const model = typeof input.model === 'string' ? input.model.trim() : '';
  if (!model || model.length > 200 || /\s/.test(model)) return { ok: false, error: 'Enter a model id (no spaces).' };
  const apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
  if (apiKey.length < 8 || apiKey.length > 500 || /\s/.test(apiKey)) return { ok: false, error: 'Paste a valid API key.' };
  let baseURL: string | null = info.baseURL ?? null;
  if (info.id === 'custom') {
    const raw = typeof input.baseURL === 'string' ? input.baseURL.trim().replace(/\/+$/, '') : '';
    const err = checkBaseURL(raw);
    if (err) return { ok: false, error: err };
    baseURL = raw;
  }
  return { ok: true, value: { provider: info.id, model, baseURL, apiKey } };
}

/* ── request context for AI calls ────────────────────────────────────────── */

export interface AIContext {
  /** The user's own provider/model/key, if they saved one. */
  user: UserAI | null;
  /** Whether this user may fall back to the server's keys. */
  allowServer: boolean;
}

const store = new AsyncLocalStorage<AIContext>();

/** Outside any request (scripts, tests) the server keys are used, as before. */
export function activeAI(): AIContext {
  return store.getStore() ?? { user: null, allowServer: true };
}

async function resolveContext(): Promise<AIContext> {
  const user = await getCurrentUser();
  if (!user || user.demo) return { user: null, allowServer: !!user && !user.demo };
  return { user: readUserAI(user.uid), allowServer: mayUseServerAI(user.email) };
}

/** Run AI work with the signed-in user's settings (background jobs started inside keep them). */
export async function withUserAI<T>(fn: () => Promise<T>): Promise<T> {
  const ctx = await resolveContext();
  return store.run(ctx, fn);
}

/** Same, for a handler that returns a streaming Response. */
export async function withUserAIResponse(fn: () => Promise<Response> | Response): Promise<Response> {
  const ctx = await resolveContext();
  return store.run(ctx, fn);
}
