import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGithubClient } from '@/lib/github/client';
import { runIngestionPipeline } from '@/lib/ingest/pipeline';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const supabase = createClient();
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const [owner, repo] = project.repo_full_name.split('/');
    const { octokit } = await getGithubClient(project.user_id);

    // Trigger re-ingestion
    runIngestionPipeline({
      projectId: id,
      octokit,
      owner,
      repo,
    }).catch((err) => {
      console.error(`Resync failed for ${id}:`, err);
    });

    return NextResponse.json({ ok: true, message: 'Resync started' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to resync';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const supabase = createClient();
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete project';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
