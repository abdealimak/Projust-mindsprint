import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/session — Set the Firebase session cookie
 * Body: { idToken: string }
 */
export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    // Decode the Firebase ID token (it's a standard JWT) to extract user info
    // We store the full token so server components can decode it
    const payload = decodeJwtPayload(idToken);
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const cookieStore = cookies();

    // Store the ID token as an httpOnly cookie
    cookieStore.set('projust_session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Also store a lightweight user info cookie (readable by middleware)
    const userInfo = JSON.stringify({
      uid: payload.sub,
      email: payload.email || null,
      name: payload.name || null,
      picture: payload.picture || null,
    });
    cookieStore.set('projust_user', userInfo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Session POST error:', err);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/session — Clear the session cookie (sign out)
 */
export async function DELETE() {
  const cookieStore = cookies();
  cookieStore.set('projust_session', '', { path: '/', maxAge: 0 });
  cookieStore.set('projust_user', '', { path: '/', maxAge: 0 });
  cookieStore.set('projust_mock_user', '', { path: '/', maxAge: 0 });
  return NextResponse.json({ ok: true });
}

/**
 * Decode a JWT payload without verifying the signature.
 * For production, use Firebase Admin SDK's verifyIdToken() instead.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
