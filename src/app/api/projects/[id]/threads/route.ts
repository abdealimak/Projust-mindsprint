import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOwnedProject } from '@/lib/auth/user';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: projectId } = params;
  try {
    const owned = await getOwnedProject(projectId, 'id');
    if (!owned.project) {
      return NextResponse.json({ error: owned.status === 401 ? 'Sign in required' : 'Project not found' }, { status: owned.status });
    }
    const supabase = createClient();
    const { data: threads } = await supabase
      .from('chat_threads')
      .select('id, title, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ threads: threads || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch threads';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
