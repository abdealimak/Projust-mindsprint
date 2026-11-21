import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  linkWithPopup,
  GoogleAuthProvider,
  type UserCredential,
  type AuthProvider,
  GithubAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './config';

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
// Request repo scopes for GitHub so we can access repos later
githubProvider.addScope('read:user');
githubProvider.addScope('public_repo');

/**
 * Popup sign-in. If the browser blocks the popup, fall back to a full-page redirect;
 * the login page picks the result up with completeRedirectSignIn() when it loads again.
 * Returns null when a redirect was started (the page is navigating away).
 */
async function signInWith(provider: AuthProvider): Promise<User | null> {
  const auth = getFirebaseAuth();
  try {
    const result = await signInWithPopup(auth, provider);
    await syncSessionCookie(result.user);
    await saveGitHubTokenFrom(result);
    return result.user;
  } catch (err) {
    if (authErrorCode(err) === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

export const signInWithGoogle = () => signInWith(googleProvider);
export const signInWithGitHub = () => signInWith(githubProvider);

/** Finish a redirect sign-in started by signInWith(). Returns the user, or null if there was none. */
export async function completeRedirectSignIn(): Promise<User | null> {
  if (!isFirebaseConfigured) return null;
  const result = await getRedirectResult(getFirebaseAuth());
  if (!result) return null;
  await syncSessionCookie(result.user);
  await saveGitHubTokenFrom(result);
  return result.user;
}

/**
 * After a GitHub sign-in, store the GitHub access token (encrypted, server-side) so repo
 * imports can use it. Best effort: sign-in still succeeds if this fails.
 */
async function saveGitHubTokenFrom(
  result: UserCredential,
  scopes = 'read:user public_repo'
): Promise<{ username?: string; token?: string }> {
  const token = GithubAuthProvider.credentialFromResult(result)?.accessToken;
  if (!token) return {};
  try {
    const res = await fetch('/api/github/save-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, scopes }),
    });
    const data = await res.json().catch(() => ({}));
    return { username: data.username, token };
  } catch (err) {
    console.warn('Could not save the GitHub repo access token:', err);
    return { token };
  }
}

/**
 * Connect (link) a GitHub account while already signed in, using a Firebase popup,
 * so no separate GitHub OAuth app is needed.
 */
export async function connectGitHubAccount(scope: 'public' | 'private' = 'public') {
  const auth = getFirebaseAuth();
  const provider = new GithubAuthProvider();
  provider.addScope('read:user');
  provider.addScope(scope === 'private' ? 'repo' : 'public_repo');

  let result: UserCredential;
  if (auth.currentUser) {
    try {
      result = await linkWithPopup(auth.currentUser, provider);
    } catch (linkErr) {
      // Already linked, or the GitHub account belongs to this user under another login: sign in with it
      try {
        result = await signInWithPopup(auth, provider);
      } catch {
        throw linkErr;
      }
    }
  } else {
    result = await signInWithPopup(auth, provider);
  }

  await syncSessionCookie(result.user);
  const saved = await saveGitHubTokenFrom(result, scope === 'private' ? 'read:user repo' : 'read:user public_repo');
  return { user: result.user, ...saved };
}

function authErrorCode(err: unknown): string | null {
  return typeof err === 'object' && err && 'code' in err && typeof err.code === 'string' ? err.code : null;
}

/** Turn a Firebase auth error into a sentence a person can act on. */
export function authErrorMessage(err: unknown, providerName: string): string | null {
  switch (authErrorCode(err)) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return null; // they closed it on purpose; no error needed
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Allow popups for this site and try again.';
    case 'auth/operation-not-allowed':
      return `${providerName} sign-in is not turned on for this Firebase project yet (Firebase console → Authentication → Sign-in method).`;
    case 'auth/unauthorized-domain':
      return `This address (${typeof window !== 'undefined' ? window.location.host : 'this domain'}) is not an authorised domain in Firebase (Authentication → Settings → Authorized domains).`;
    case 'auth/account-exists-with-different-credential':
      return 'You already signed up with a different provider using this email. Use that one instead.';
    case 'auth/network-request-failed':
      return 'Could not reach the sign-in service. Check your connection and try again.';
    case 'auth/invalid-api-key':
    case 'auth/configuration-not-found':
      return 'Firebase is not set up correctly (check the NEXT_PUBLIC_FIREBASE_* keys in .env).';
  }
  if (err instanceof Error && !err.message.startsWith('Firebase:')) return err.message;
  return `${providerName} sign-in failed. Please try again.`;
}

export async function signOut() {
  // Clear server session cookie
  try {
    await fetch('/api/auth/session', { method: 'DELETE' });
  } catch {
    // ignore
  }
  if (isFirebaseConfigured) await firebaseSignOut(getFirebaseAuth());
}

/**
 * After Firebase sign-in, sync the ID token to an httpOnly server cookie
 * so Next.js middleware and server components can verify the session.
 */
async function syncSessionCookie(user: User) {
  const idToken = await user.getIdToken();
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Don't leave a half-signed-in Firebase state behind
    await firebaseSignOut(getFirebaseAuth()).catch(() => {});
    throw new Error(body.error || 'Sign-in could not be verified');
  }
}

/**
 * Listen to auth state and keep the session cookie fresh.
 * Call this once from a client-side provider.
 */
export function onAuthChange(callback: (user: User | null) => void) {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(getFirebaseAuth(), async (user) => {
    if (user) {
      // Refresh the session cookie whenever the token refreshes
      await syncSessionCookie(user);
    }
    callback(user);
  });
}

export { getFirebaseAuth, isFirebaseConfigured };
export type { User };
