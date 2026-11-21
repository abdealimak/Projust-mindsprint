import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  SESSION_COOKIE,
  DEMO_COOKIE,
  SESSION_MAX_AGE_S,
  verifyFirebaseIdToken,
  createSessionToken,
} from '@/lib/auth/session';

/**
 * POST /api/auth/session — exchange a Firebase ID token for a Projust session cookie.
 * Body: { idToken: string }
 */
export async function POST(request: Request) {
  let idToken: unknown;
  try {
    ({ idToken } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!idToken || typeof idToken !== 'string' || idToken.length > 8192) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  let user;
  try {
    user = await verifyFirebaseIdToken(idToken);
  } catch (err) {
    console.warn('[auth] Rejected Firebase ID token:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Sign-in could not be verified. Please try again.' }, { status: 401 });
  }

  try {
    const session = await createSessionToken(user);
    const store = cookies();
    store.set(SESSION_COOKIE, session, {
      httpOnly: true,
      // Secure whenever served over https; plain http://localhost (incl. `npm run demo`) still works
      secure: new URL(request.url).protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_S,
    });
    // A real sign-in replaces demo mode, and the old unsigned user-info cookie is retired.
    store.set(DEMO_COOKIE, '', { path: '/', maxAge: 0 });
    store.set('projust_user', '', { path: '/', maxAge: 0 });

    return NextResponse.json({ ok: true, uid: user.uid });
  } catch (err) {
    console.error('Session POST error:', err);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

/** DELETE /api/auth/session — sign out */
export async function DELETE() {
  const store = cookies();
  store.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  store.set('projust_user', '', { path: '/', maxAge: 0 });
  store.set(DEMO_COOKIE, '', { path: '/', maxAge: 0 });
  // GitHub token/username cookies belong to this user; don't hand them to the next sign-in
  store.set('projust_gh_token', '', { path: '/', maxAge: 0 });
  store.set('projust_gh_user', '', { path: '/', maxAge: 0 });
  return NextResponse.json({ ok: true });
}
