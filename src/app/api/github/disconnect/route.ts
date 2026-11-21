import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserId } from '@/lib/auth/user';

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  try {
    const supabase = createClient();
    await supabase.from('github_connections').delete().eq('user_id', userId);
  } catch (err) {
    console.error('Error disconnecting github:', err);
  }

  const cookieStore = cookies();
  cookieStore.set('projust_gh_token', '', { path: '/', maxAge: 0 });
  cookieStore.set('projust_gh_user', '', { path: '/', maxAge: 0 });

  return NextResponse.json({ ok: true });
}
