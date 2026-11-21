import {
  signInWithPopup,
  linkWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './config';

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
// Request repo scopes for GitHub so we can access repos later
githubProvider.addScope('read:user');
githubProvider.addScope('public_repo');

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await syncSessionCookie(result.user);
  return result.user;
}

export async function signInWithGitHub() {
  const result = await signInWithPopup(auth, githubProvider);
  await syncSessionCookie(result.user);

  // Extract GitHub OAuth Access Token and persist for repo imports
  try {
    const credential = GithubAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (token) {
      await fetch('/api/github/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, scopes: 'read:user public_repo' }),
      });
    }
  } catch (err) {
    console.warn('Could not auto-sync GitHub repo access token:', err);
  }

  return result.user;
}

/**
 * Connects or links a GitHub account while already logged in.
 * Uses Firebase popup so no separate redirect or OAuth app is required.
 */
export async function connectGitHubAccount(scope: 'public' | 'private' = 'public') {
  const provider = new GithubAuthProvider();
  provider.addScope('read:user');
  if (scope === 'private') {
    provider.addScope('repo');
  } else {
    provider.addScope('public_repo');
  }

  let result;
  if (auth.currentUser) {
    try {
      result = await linkWithPopup(auth.currentUser, provider);
    } catch (linkErr: unknown) {
      const errCode = (linkErr as { code?: string })?.code;
      if (
        errCode === 'auth/credential-already-in-use' ||
        errCode === 'auth/provider-already-linked' ||
        errCode === 'auth/email-already-in-use'
      ) {
        result = await signInWithPopup(auth, provider);
      } else {
        try {
          result = await signInWithPopup(auth, provider);
        } catch {
          throw linkErr;
        }
      }
    }
  } else {
    result = await signInWithPopup(auth, provider);
  }

  await syncSessionCookie(result.user);

  const credential = GithubAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (token) {
    const res = await fetch('/api/github/save-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        scopes: scope === 'private' ? 'read:user repo' : 'read:user public_repo',
      }),
    });
    const data = await res.json();
    return { user: result.user, username: data.username, token };
  }

  return { user: result.user };
}

export async function signOut() {
  // Clear server session cookie
  try {
    await fetch('/api/auth/session', { method: 'DELETE' });
  } catch {
    // ignore
  }
  await firebaseSignOut(auth);
}

/**
 * After Firebase sign-in, sync the ID token to an httpOnly server cookie
 * so Next.js middleware and server components can verify the session.
 */
async function syncSessionCookie(user: User) {
  const idToken = await user.getIdToken();
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
}

/**
 * Listen to auth state and keep the session cookie fresh.
 * Call this once from a client-side provider.
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Refresh the session cookie whenever the token refreshes
      await syncSessionCookie(user);
    }
    callback(user);
  });
}

export { auth };
export type { User };
