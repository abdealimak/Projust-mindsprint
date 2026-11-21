import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';
  const errorParam = searchParams.get('error_description') || searchParams.get('error');

  if (errorParam) {
    console.error('Auth callback returned error param:', errorParam);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorParam)}`);
  }

  if (code) {
    const cookieStore = cookies();
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('exchangeCodeForSession failed:', exchangeError);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    if (data?.user) {
      // Sync or insert profile row
      try {
        const user = data.user;
        const rawMeta = user.user_metadata || {};
        const isGithub = user.app_metadata?.provider === 'github' || Boolean(rawMeta.user_name);
        const derivedUsername =
          rawMeta.user_name ||
          rawMeta.preferred_username ||
          user.email?.split('@')[0] ||
          `dev_${user.id.slice(0, 5)}`;

        await supabase.from('profiles').upsert(
          {
            id: user.id,
            username: derivedUsername,
            full_name: rawMeta.full_name || rawMeta.name || derivedUsername,
            avatar_url: rawMeta.avatar_url || rawMeta.picture || '',
            email: user.email,
            headline: 'Software Developer',
            github_username: rawMeta.user_name || null,
            github_connected: isGithub,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      } catch (profileErr) {
        console.error('Profile upsert caught error:', profileErr);
      }

      return response;
    }
  }

  // Fallback
  return NextResponse.redirect(`${origin}/login?error=Could%20not%20authenticate%20user`);
}
