import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getGithubClient } from '@/lib/github/client';
import { runIngestionPipeline } from '@/lib/ingest/pipeline';
import { getCurrentUserId } from '@/lib/auth/user';

const ImportSchema = z.object({
  repoFullName: z.string().optional(),
  repoUrl: z.string().url().optional(),
}).refine((data) => data.repoFullName || data.repoUrl, {
  message: 'Either repoFullName or repoUrl must be provided',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    let fullName = parsed.data.repoFullName;
    let url = parsed.data.repoUrl;

    if (!fullName && url) {
      // Parse https://github.com/owner/repo
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        return NextResponse.json({ error: 'Only github.com URLs are supported' }, { status: 400 });
      }
      fullName = `${match[1]}/${match[2].replace(/\.git$/, '')}`;
    }

    if (!fullName) {
      return NextResponse.json({ error: 'Invalid repository name' }, { status: 400 });
    }

    const [owner, repo] = fullName.split('/');
    if (!owner || !repo) {
      return NextResponse.json({ error: 'Repository name must be in owner/repo format' }, { status: 400 });
    }

    if (!url) {
      url = `https://github.com/${owner}/${repo}`;
    }

    // Get current user id
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    // GitHub username saved at sign-in/connect time (httpOnly cookie set by /api/github/save-token)
    let ghUsername: string | null = cookies().get('projust_gh_user')?.value || null;

    const supabase = createClient();

    if (!ghUsername) {
      try {
        const { data: conn } = await supabase
          .from('github_connections')
          .select('github_username')
          .eq('user_id', userId)
          .maybeSingle();
        if (conn?.github_username) {
          ghUsername = conn.github_username;
        }
      } catch {
        // ignore
      }
    }

    // Check if project already exists for this user
    const { data: existing } = await supabase
      .from('projects')
      .select('id, status')
      .eq('user_id', userId)
      .eq('repo_full_name', fullName)
      .maybeSingle();

    let projectId = existing?.id;

    if (!projectId) {
      const { data: inserted, error: insertError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          source: parsed.data.repoUrl ? 'public_url' : 'github',
          repo_full_name: fullName,
          repo_url: url,
          status: 'pending',
          status_detail: 'Queued for ingestion...',
        })
        .select('id')
        .single();

      if (insertError || !inserted) {
        throw new Error(insertError?.message || 'Failed to create project record');
      }
      projectId = inserted.id;
    }

    // Get GitHub client
    const { octokit } = await getGithubClient(userId);

    // Run ingestion asynchronously
    runIngestionPipeline({
      projectId,
      octokit,
      owner,
      repo,
      username: ghUsername,
    }).catch((err) => {
      console.error(`Background ingestion failed for ${projectId}:`, err);
    });

    return NextResponse.json({ id: projectId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to import repository';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
