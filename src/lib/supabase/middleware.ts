import { NextResponse, type NextRequest } from 'next/server';
import { DEMO_COOKIE, SESSION_COOKIE, resolveUser } from '@/lib/auth/session';

/**
 * Middleware: lets a request through only with a verified session or an allowed demo cookie.
 * No more Supabase auth dependency.
 */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check authentication: Firebase session or demo mock
  // Verified signed session, or a (namespaced) demo user when demo mode is allowed
  const user = await resolveUser(
    request.cookies.get(SESSION_COOKIE)?.value,
    request.cookies.get(DEMO_COOKIE)?.value
  );
  const isAuthenticated = Boolean(user);

  // Root: the marketing landing page (static, public/landing.html) for everyone.
  // Its sign-in CTAs go to /login, which forwards signed-in users to the dashboard.
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/landing.html', request.url));
  }

  // Public routes that don't need auth
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/u/') ||
    pathname.startsWith('/cert/') ||
    pathname.startsWith('/api/certificates/PJ-') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.');

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Real accounts skip the login page. Demo users still see it, so they can switch to
  // GitHub or Google sign-in (the landing page's "Sign in" buttons point here).
  if (user && !user.demo && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}
