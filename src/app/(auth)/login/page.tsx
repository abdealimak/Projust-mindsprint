'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GeometricArt } from '@/components/auth/GeometricArt';
import { signInWithGoogle, signInWithGitHub } from '@/lib/firebase/auth';

function LoginFormContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | 'demo' | 'email' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam ? decodeURIComponent(errorParam) : null
  );

  const handleGoogleSignIn = async () => {
    setLoadingProvider('google');
    setErrorMessage(null);
    try {
      await signInWithGoogle();
      // Session cookie is set by signInWithGoogle → syncSessionCookie
      window.location.href = next;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setErrorMessage(msg);
      setLoadingProvider(null);
    }
  };

  const handleGitHubSignIn = async () => {
    setLoadingProvider('github');
    setErrorMessage(null);
    try {
      await signInWithGitHub();
      window.location.href = next;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'GitHub sign-in failed';
      setErrorMessage(msg);
      setLoadingProvider(null);
    }
  };

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

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0c0e14] text-[#111827] dark:text-[#f3f4f6] flex flex-col justify-between p-6 sm:p-10 lg:p-16">
      {/* Top back navigation */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
        >
          <span>&larr;</span> Back to home
        </Link>
      </div>

      {/* Main split grid */}
      <div className="w-full max-w-7xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center py-8">
        {/* Left Form Column */}
        <div className="lg:col-span-6 max-w-md mx-auto lg:mx-0 w-full flex flex-col justify-center">
          {/* Brand Mark */}
          <div className="mb-8">
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M7 17L17 7M17 7H9M17 7V15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white mb-2">
            Sign in to your account
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8">
            Verify project comprehension and manage your certified credentials
          </p>

          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Email input form */}
          <form onSubmit={handleEmailContinue} className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Enter your email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#161a26] border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={Boolean(loadingProvider)}
              className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-white text-sm font-medium transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loadingProvider === 'email' ? 'Continuing...' : 'Continue'}
            </button>
          </form>

          {/* OR divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="relative px-3 bg-white dark:bg-[#0c0e14] text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
              or
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            {/* Google */}
            <button
              type="button"
              disabled={Boolean(loadingProvider)}
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white hover:bg-neutral-50 dark:bg-[#161a26] dark:hover:bg-[#1f2434] text-neutral-800 dark:text-neutral-200 text-sm font-medium transition flex items-center justify-center gap-3 cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {loadingProvider === 'google' ? 'Signing in with Google...' : 'Continue with Google'}
            </button>

            {/* GitHub */}
            <button
              type="button"
              disabled={Boolean(loadingProvider)}
              onClick={handleGitHubSignIn}
              className="w-full py-3 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white hover:bg-neutral-50 dark:bg-[#161a26] dark:hover:bg-[#1f2434] text-neutral-800 dark:text-neutral-200 text-sm font-medium transition flex items-center justify-center gap-3 cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4 fill-current text-neutral-900 dark:text-white" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              {loadingProvider === 'github' ? 'Connecting to GitHub...' : 'Continue with GitHub'}
            </button>

            {/* Demo Mode */}
            <button
              type="button"
              disabled={Boolean(loadingProvider)}
              onClick={handleDemoLogin}
              className="w-full py-2.5 px-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 hover:bg-neutral-100 dark:bg-neutral-900/50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>⚡</span>
              {loadingProvider === 'demo' ? 'Entering Demo Mode...' : 'Enter Demo Mode (One-click Preview)'}
            </button>
          </div>
        </div>

        {/* Right Geometric Mosaic Column (Desktop) */}
        <div className="hidden lg:flex lg:col-span-6 justify-center items-center">
          <GeometricArt />
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500 pt-6 border-t border-neutral-100 dark:border-neutral-900">
        <div>&copy; {new Date().getFullYear()} Projust Inc. All rights reserved.</div>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/docs" className="hover:underline">Documentation</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0c0e14]">
          <div className="w-8 h-8 rounded-full border-2 border-neutral-900 dark:border-white border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
