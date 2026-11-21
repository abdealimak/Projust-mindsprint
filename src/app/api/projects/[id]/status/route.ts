import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const supabase = createClient();
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, repo_full_name, status, status_detail, file_count, summary, ownership_pct, ownership_status')
      .eq('id', id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to get status';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
