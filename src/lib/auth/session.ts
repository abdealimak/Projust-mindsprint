import { SignJWT, jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';

/**
 * Sessions.
 *
 * 1. At sign-in the browser sends its Firebase ID token to /api/auth/session.
 * 2. We verify it against Google's public keys (signature, issuer, audience, expiry).
 * 3. We then issue our own HS256-signed session token (7 days) in an httpOnly cookie.
 *    Firebase ID tokens expire after 1 hour, so storing them directly would log people out.
 *
 * Demo mode (`projust_mock_user` cookie) is allowed unless ALLOW_DEMO_MODE=false. Demo users
 * get ids prefixed with "demo:", so a demo cookie can never impersonate a real Firebase uid.
 *
 * No Next.js-only imports here: this file also runs in middleware (Edge runtime).
 */

export const SESSION_COOKIE = 'projust_session';
export const DEMO_COOKIE = 'projust_mock_user';
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7;

export interface SessionUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  demo: boolean;
}

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

let warnedDevSecret = false;
function sessionSecret(): Uint8Array {
  const explicit = process.env.SESSION_SECRET;
  const derived = process.env.TOKEN_ENCRYPTION_KEY ? `projust-session:${process.env.TOKEN_ENCRYPTION_KEY}` : '';
  const secret = explicit || derived;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET (or TOKEN_ENCRYPTION_KEY) must be set in production');
    }
    if (!warnedDevSecret) {
      console.warn('[auth] SESSION_SECRET not set; using an insecure development secret');
      warnedDevSecret = true;
    }
    return new TextEncoder().encode('projust-dev-only-session-secret-change-me');
  }
  return new TextEncoder().encode(secret);
}

export const isDemoAllowed = process.env.ALLOW_DEMO_MODE !== 'false';

/** Verifies a Firebase ID token. Throws if it is forged, expired, or for another project. */
export async function verifyFirebaseIdToken(idToken: string): Promise<SessionUser> {
  if (!FIREBASE_PROJECT_ID) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set');

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    algorithms: ['RS256'],
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    audience: FIREBASE_PROJECT_ID,
  });

  if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) {
    throw new Error('Token has no valid subject');
  }
  const authTime = Number((payload as JWTPayload & { auth_time?: number }).auth_time);
  if (!Number.isFinite(authTime) || authTime > Math.floor(Date.now() / 1000) + 60) {
    throw new Error('Token auth_time is invalid');
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    name: typeof payload.name === 'string' ? payload.name : null,
    picture: typeof payload.picture === 'string' ? payload.picture : null,
    demo: false,
  };
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, picture: user.picture })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.uid)
    .setIssuer('projust')
    .setAudience('projust-app')
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_S}s`)
    .sign(sessionSecret());
}

export async function verifySessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      algorithms: ['HS256'],
      issuer: 'projust',
      audience: 'projust-app',
    });
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      name: typeof payload.name === 'string' ? payload.name : null,
      picture: typeof payload.picture === 'string' ? payload.picture : null,
      demo: false,
    };
  } catch {
    return null;
  }
}

/** Demo users are namespaced ("demo:alexchen") so they can't collide with real accounts. */
export function demoUserFromCookie(value: string | undefined): SessionUser | null {
  if (!value || !isDemoAllowed) return null;
  let name: string;
  try {
    name = decodeURIComponent(value);
  } catch {
    return null;
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 40);
  if (!slug) return null;
  return {
    uid: `demo:${slug}`,
    email: null,
    name: slug === 'alexchen' ? 'Alex Chen' : slug,
    picture: null,
    demo: true,
  };
}

/** Resolve the user from raw cookie values (works in middleware and in route handlers). */
export async function resolveUser(sessionCookie?: string, demoCookie?: string): Promise<SessionUser | null> {
  return (await verifySessionToken(sessionCookie)) ?? demoUserFromCookie(demoCookie);
}
