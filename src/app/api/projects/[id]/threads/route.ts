import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: projectId } = params;
  try {
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
