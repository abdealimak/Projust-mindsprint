import { NextResponse } from 'next/server';
import { withUserAI } from '@/lib/ai/user-settings';
import { runAfterResponse } from '@/lib/server/background';
import { createClient } from '@/lib/supabase/server';
import { getOwnedProject } from '@/lib/auth/user';
import { getGithubClient } from '@/lib/github/client';
import { runIngestionPipeline } from '@/lib/ingest/pipeline';

/** Ingestion and the repo summary keep running after the response; allow up to 5 minutes. */
export const maxDuration = 300;

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

    // Keeps running after the response (Vercel: kept alive via waitUntil), with this user's AI settings
    await withUserAI(async () => {
      runAfterResponse(`resync:${id}`, () =>
        runIngestionPipeline({
          projectId: id,
          octokit,
          owner,
          repo,
        })
      );
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
