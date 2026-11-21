import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOwnedProject } from '@/lib/auth/user';
import { getGithubClient } from '@/lib/github/client';
import { runIngestionPipeline } from '@/lib/ingest/pipeline';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const { project, status } = await getOwnedProject<{ repo_full_name: string; user_id: string }>(id);
    if (!project) {
      return NextResponse.json({ error: status === 401 ? 'Sign in required' : 'Project not found' }, { status });
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
    const owned = await getOwnedProject(id, 'id');
    if (!owned.project) {
      return NextResponse.json({ error: owned.status === 401 ? 'Sign in required' : 'Project not found' }, { status: owned.status });
    }
    const supabase = createClient();
    const { error } = await supabase.from('projects').delete().eq('id', id).eq('user_id', owned.userId!);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete project';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
