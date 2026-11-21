'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProjustLogo } from '@/components/ui/Logo';
import { GeometricArt } from '@/components/auth/GeometricArt';
import {
  signInWithGoogle,
  signInWithGitHub,
  completeRedirectSignIn,
  authErrorMessage,
} from '@/lib/firebase/auth';

function LoginFormContent() {
  const searchParams = useSearchParams();
  // Only same-site paths, so ?next= can't send people to another site after sign-in
  const rawNext = searchParams.get('next') || '';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\') ? rawNext : '/dashboard';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | 'demo' | 'email' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam ? decodeURIComponent(errorParam) : null
  );

  // Finish a sign-in that fell back to a full-page redirect (popup was blocked)
  useEffect(() => {
    completeRedirectSignIn()
      .then((user) => {
        if (user) window.location.href = next;
      })
      .catch((err: unknown) => setErrorMessage(authErrorMessage(err, 'Sign-in')));
  }, [next]);

  const handleProviderSignIn = async (
    provider: 'google' | 'github',
    signIn: () => Promise<unknown>,
    label: string
  ) => {
    setLoadingProvider(provider);
    setErrorMessage(null);
    try {
      const user = await signIn();
      // null means a redirect sign-in started; the page is navigating away
      if (user) window.location.href = next;
    } catch (err: unknown) {
      setErrorMessage(authErrorMessage(err, label));
      setLoadingProvider(null);
    }
  };

  const handleGoogleSignIn = () => handleProviderSignIn('google', signInWithGoogle, 'Google');
  const handleGitHubSignIn = () => handleProviderSignIn('github', signInWithGitHub, 'GitHub');

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoadingProvider('email');
    // For now, email login uses demo mode with the email prefix as username
    document.cookie = `projust_mock_user=${encodeURIComponent(email.split('@')[0])}; path=/; max-age=86400`;
    window.location.href = next;
  };

  const handleDemoLogin = () => {
    setLoadingProvider('demo');
    document.cookie = `projust_mock_user=alexchen; path=/; max-age=86400`;
    window.location.href = next;
  };

  const field =
    'w-full h-12 px-5 rounded-full bg-sheet border border-line-2 text-ink text-[15px] placeholder:text-[#8F8B84] focus:outline-none focus:border-ink transition-colors';
  const ghost =
    'w-full h-12 px-5 rounded-full border border-line bg-sheet text-ink text-[15px] font-medium flex items-center justify-center gap-3 transition-[transform,box-shadow] duration-200 ease-land hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,.25)] disabled:opacity-50 disabled:hover:translate-y-0';

  return (
    <div className="min-h-screen w-full bg-paper text-ink flex flex-col px-5 sm:px-10 lg:px-20">
      <header className="h-[72px] flex items-center justify-between">
        <a href="/" className="rounded-md" aria-label="Projust home">
          <ProjustLogo />
        </a>
        <a href="/" className="text-[14px] text-ink-2 hover:text-ink transition-colors">
          ← Back to home
        </a>
      </header>

      <div className="w-full max-w-[1280px] mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-12 items-center py-10">
        <div className="lg:col-span-5 max-w-[440px] w-full mx-auto lg:mx-0">
          <span className="pj-eyebrow">Sign in</span>
          <h1 className="pj-display text-[clamp(44px,5vw,68px)] mt-5">
            Built it? <em>Now prove you understand it.</em>
          </h1>
          <p className="text-[17px] text-muted mt-5 mb-10 max-w-[40ch]">
            Sign in to import a repo, learn it with a tutor and earn a certificate recruiters can check.
          </p>

          {errorMessage && (
            <div role="alert" className="mb-6 px-5 py-3.5 rounded-2xl border border-[#F5CFCF] bg-[#FDECEC] text-[#B4232C] text-[14px]">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3">
            <button type="button" disabled={Boolean(loadingProvider)} onClick={handleGitHubSignIn} className="pj-btn w-full min-h-[48px] text-[15px] disabled:opacity-50">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden>
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              {loadingProvider === 'github' ? 'Connecting to GitHub…' : 'Continue with GitHub'}
            </button>

            <button type="button" disabled={Boolean(loadingProvider)} onClick={handleGoogleSignIn} className={ghost}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {loadingProvider === 'google' ? 'Signing in with Google…' : 'Continue with Google'}
            </button>
          </div>

          <div className="relative my-7 flex items-center gap-4 text-[13px] text-muted">
            <span className="flex-1 h-px bg-line" />
            or use email
            <span className="flex-1 h-px bg-line" />
          </div>

          <form onSubmit={handleEmailContinue} className="flex flex-col sm:flex-row gap-3">
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
              className={field}
            />
            <button type="submit" disabled={Boolean(loadingProvider)} className="pj-btn pj-btn-ghost min-h-[48px] px-6 disabled:opacity-50">
              {loadingProvider === 'email' ? 'Continuing…' : 'Continue'}
            </button>
          </form>

          <button
            type="button"
            disabled={Boolean(loadingProvider)}
            onClick={handleDemoLogin}
            className="mt-6 text-[14px] text-muted hover:text-ink underline underline-offset-4 decoration-line-2 hover:decoration-ink transition-colors"
          >
            {loadingProvider === 'demo' ? 'Opening the demo…' : 'Or look around with demo data'}
          </button>
        </div>

        <div className="hidden lg:flex lg:col-start-7 lg:col-span-6 justify-center items-center">
          <GeometricArt />
        </div>
      </div>

      <footer className="py-6 border-t border-line text-[13px] text-muted">
        Projust: project + justice. Fair credit for students who understand what they build.
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper">
          <div className="w-8 h-8 rounded-full border-2 border-ink border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
