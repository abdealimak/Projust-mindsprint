import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getOwnedProject } from '@/lib/auth/user';
import { isDemoProject, demoProjectFiles } from '@/lib/brain/demo';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const user = await getCurrentUser();
    if (user?.demo) {
      return isDemoProject(id)
        ? NextResponse.json({ files: demoProjectFiles() })
        : NextResponse.json({ error: 'Sample data is available for alexchen-dev/shop-api only.' }, { status: 404 });
    }
    const owned = await getOwnedProject(id, 'id');
    if (!owned.project) {
      return NextResponse.json({ error: owned.status === 401 ? 'Sign in required' : 'Project not found' }, { status: owned.status });
    }
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
