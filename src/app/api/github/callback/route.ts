import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Octokit } from '@octokit/rest';
import { encryptToken } from '@/lib/crypto';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserId } from '@/lib/auth/user';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${origin}/projects/new?error=${encodeURIComponent(error || 'cancelled')}`);
  }

  const cookieStore = cookies();
  const savedState = cookieStore.get('github_oauth_state')?.value;
  if (!state || state !== savedState) {
    return NextResponse.redirect(`${origin}/projects/new?error=invalid_oauth_state`);
  }

  // Clear state cookie
  cookieStore.set('github_oauth_state', '', { path: '/', maxAge: 0 });

  const clientId = process.env.GITHUB_REPO_CLIENT_ID;
  const clientSecret = process.env.GITHUB_REPO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/projects/new?error=github_client_credentials_missing`);
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange token');
    }

    const accessToken = tokenData.access_token;
    const scopes = tokenData.scope || '';

    // Fetch GitHub User details
    const octokit = new Octokit({ auth: accessToken });
    const { data: ghUser } = await octokit.users.getAuthenticated();

    // Encrypt token
    const encryptedToken = encryptToken(accessToken);

    // Identify user
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.redirect(`${origin}/login?next=/projects/new`);
    }

    // Persist into github_connections
    try {
      const supabase = createClient();
      await supabase.from('github_connections').upsert({
        user_id: userId,
        github_user_id: ghUser.id,
        github_username: ghUser.login,
        access_token_enc: encryptedToken,
        scopes,
        updated_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.error('Failed to save github connection:', dbErr);
    }

    return NextResponse.redirect(`${origin}/projects/new?connected=true`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'GitHub authorization failed';
    return NextResponse.redirect(`${origin}/projects/new?error=${encodeURIComponent(msg)}`);
  }
}
