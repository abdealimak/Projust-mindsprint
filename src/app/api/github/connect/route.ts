import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const scopeType = searchParams.get('scope') === 'private' ? 'private' : 'public';
  const clientId = process.env.GITHUB_REPO_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(`${origin}/projects/new`);
  }

  const state = crypto.randomBytes(24).toString('hex');
  const cookieStore = cookies();
  cookieStore.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  const scopes = scopeType === 'private' ? 'read:user repo' : 'read:user public_repo';
  const redirectUri = `${origin}/api/github/callback`;

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;

  return NextResponse.redirect(authUrl);
}
