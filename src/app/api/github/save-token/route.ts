import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Octokit } from '@octokit/rest';
import { encryptToken } from '@/lib/crypto';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { token, scopes = 'read:user public_repo' } = await request.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'GitHub access token is required' }, { status: 400 });
    }

    const cookieStore = cookies();
    const userCookie = cookieStore.get('projust_user')?.value;
    const mockCookie = cookieStore.get('projust_mock_user')?.value;

    let userId = 'anonymous';
    if (userCookie) {
      try {
        const parsed = JSON.parse(userCookie);
        userId = parsed.uid || 'anonymous';
      } catch {
        // ignore
      }
    } else if (mockCookie) {
      userId = mockCookie;
    }

    // Verify token with GitHub
    const octokit = new Octokit({ auth: token });
    const { data: ghUser } = await octokit.users.getAuthenticated();

    // Encrypt token using AES-256-GCM
    const encryptedToken = encryptToken(token);

    // Save into github_connections table in Supabase
    const supabase = createClient();
    const { error: dbError } = await supabase.from('github_connections').upsert({
      user_id: userId,
      github_user_id: ghUser.id,
      github_username: ghUser.login,
      access_token_enc: encryptedToken,
      scopes,
      updated_at: new Date().toISOString(),
    });

    if (dbError) {
      console.warn('Note: github_connections DB upsert:', dbError.message);
    }

    // Set secure httpOnly cookies so token & username are immediately available
    cookieStore.set('projust_gh_token', encryptedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    cookieStore.set('projust_gh_user', ghUser.login, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    // Also update profile github status
    try {
      await supabase.from('profiles').update({
        github_connected: true,
        github_username: ghUser.login,
      }).eq('id', userId);
    } catch {
      // ignore
    }

    return NextResponse.json({
      ok: true,
      username: ghUser.login,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save GitHub connection';
    console.error('save-token error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
