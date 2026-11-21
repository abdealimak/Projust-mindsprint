import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const supabase = createClient();
    const { data: files, error } = await supabase
      .from('project_files')
      .select('path, language, size_bytes, line_count, content')
      .eq('project_id', id)
      .order('priority', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ files: files || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch files';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
