import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { DEMO_COOKIE, SESSION_COOKIE, resolveUser, type SessionUser } from './session';

/**
 * The signed-in user from a verified session cookie (or a namespaced demo user).
 * Returns null when nobody is signed in or the session is forged/expired.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = cookies();
  return resolveUser(store.get(SESSION_COOKIE)?.value, store.get(DEMO_COOKIE)?.value);
}

export async function getCurrentUserId(): Promise<string | null> {
  return (await getCurrentUser())?.uid ?? null;
}

/**
 * Loads a project only if it belongs to the current user. The server uses the Supabase
 * service-role key (RLS is bypassed), so every per-project route must go through this.
 */
export async function getOwnedProject<T = Record<string, unknown>>(
  projectId: string,
  columns = '*'
): Promise<{ project: T | null; userId: string | null; status: 401 | 404 | 200 }> {
  const userId = await getCurrentUserId();
  if (!userId) return { project: null, userId, status: 401 };

  const supabase = createClient();
  const { data } = await supabase
    .from('projects')
    .select(columns)
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return { project: null, userId, status: 404 };
  return { project: data as T, userId, status: 200 };
}
