import { NextResponse, type NextRequest } from 'next/server';

/**
 * Simplified middleware: checks for Firebase session cookie or demo mock cookie.
 * No more Supabase auth dependency.
 */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check authentication: Firebase session or demo mock
  const firebaseSession = request.cookies.get('projust_session')?.value;
  const mockUser = request.cookies.get('projust_mock_user')?.value;
  const isAuthenticated = Boolean(firebaseSession || mockUser);

  // Root redirect
  if (pathname === '/') {
    const target = isAuthenticated ? '/dashboard' : '/login';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Public routes that don't need auth
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/u/') ||
    pathname.startsWith('/cert/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.');

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from login
  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}
