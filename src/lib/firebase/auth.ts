import {
  signInWithPopup,
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
  return result.user;
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
