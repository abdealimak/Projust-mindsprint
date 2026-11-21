import { NextResponse } from 'next/server';
import { getCurrentUser, getOwnedProject } from '@/lib/auth/user';
import { isDemoProject, demoProjectStatus } from '@/lib/brain/demo';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const user = await getCurrentUser();
    if (user?.demo) {
      return isDemoProject(id)
        ? NextResponse.json(demoProjectStatus())
        : NextResponse.json({ error: 'Sample data is available for alexchen-dev/shop-api only.' }, { status: 404 });
    }
    const { project, status } = await getOwnedProject(
      id,
      'id, repo_full_name, repo_url, default_branch, commit_sha, primary_language, status, status_detail, file_count, summary, ownership_pct, ownership_status'
    );
    if (!project) {
      return NextResponse.json({ error: status === 401 ? 'Sign in required' : 'Project not found' }, { status });
    }

    return NextResponse.json(project);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to get status';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
