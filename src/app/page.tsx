import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export default async function RootPage() {
  const cookieStore = cookies();
  const mockUser = cookieStore.get('projust_mock_user')?.value;

  if (mockUser) {
    redirect('/dashboard');
  }

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      redirect('/dashboard');
    }
  } catch {
    // ignore
  }

  redirect('/login');
}
