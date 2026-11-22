import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Same-site sign-in: with NEXT_PUBLIC_FIREBASE_AUTH_PROXY=1 the sign-in helper is served from
 * this site's own /__/auth/* (proxied to <project>.firebaseapp.com in next.config.mjs), so
 * browsers that block third-party storage can still finish Google/GitHub sign-in.
 * Each provider must list https://<this-site>/__/auth/handler as a redirect URI first.
 */
function authDomain(): string | undefined {
  if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_PROXY === '1' && typeof window !== 'undefined') return window.location.host;
  return firebaseConfig.authDomain;
}

/** True when the Firebase env vars are present. Without them only demo mode works. */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let cachedAuth: Auth | null = null;

/**
 * Lazily initialise Firebase so a missing or invalid config doesn't crash
 * every page at import time (e.g. a fresh clone without .env.local).
 */
export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* keys to .env.local.');
  }
  // Prevent re-initialization in hot reload
  const app: FirebaseApp = getApps().length === 0 ? initializeApp({ ...firebaseConfig, authDomain: authDomain() }) : getApps()[0];
  cachedAuth = getAuth(app);
  return cachedAuth;
}
