import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const cookieStore = cookies();
  const userCookie = cookieStore.get('projust_user')?.value;
  let userId = 'anonymous';
  if (userCookie) {
    try {
      const parsed = JSON.parse(userCookie);
      userId = parsed.uid || 'anonymous';
    } catch {
      // ignore
    }
  }

  try {
    const supabase = createClient();
    await supabase.from('github_connections').delete().eq('user_id', userId);
  } catch (err) {
    console.error('Error disconnecting github:', err);
  }

  return NextResponse.json({ ok: true });
}
