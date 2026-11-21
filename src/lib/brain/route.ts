import { NextResponse } from 'next/server';
import { getCurrentUser, getOwnedProject } from '@/lib/auth/user';
import type { SessionUser } from '@/lib/auth/session';
import { BrainError } from './service';
import { isDemoProject } from './demo';

export type Ctx =
  | { kind: 'demo'; user: SessionUser; projectId: string }
  | { kind: 'real'; user: SessionUser; projectId: string };

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function fail(err: unknown) {
  if (err instanceof BrainError) return json({ error: err.message }, err.status);
  console.error('[brain] route error:', err);
  return json({ error: 'Something went wrong. Try again.' }, 500);
}

/** Resolve the signed-in user and check they own the project (demo users: only the demo project). */
export async function projectCtx(projectId: string): Promise<Ctx | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return json({ error: 'Sign in required' }, 401);
  if (user.demo) {
    if (!isDemoProject(projectId)) return json({ error: 'Sample learning data is available for alexchen-dev/shop-api only.' }, 404);
    return { kind: 'demo', user, projectId };
  }
  const owned = await getOwnedProject(projectId, 'id');
  if (!owned.project) return json({ error: owned.status === 401 ? 'Sign in required' : 'Project not found' }, owned.status);
  return { kind: 'real', user, projectId };
}

export async function userCtx(): Promise<SessionUser | NextResponse> {
  const user = await getCurrentUser();
  return user ?? json({ error: 'Sign in required' }, 401);
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
