import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/user';
import { createClient } from '@/lib/supabase/server';
import { mockProjects } from '@/lib/mock';

export const dynamic = 'force-dynamic';

export interface SearchProjectHit {
  id: string;
  repo_full_name: string;
  status: string;
  summary: string | null;
}

const LIMIT = 8;

/**
 * Searches the signed-in user's own projects by repo name.
 * Empty query returns the most recent projects. Demo users search the sample projects.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 100);

  if (user.demo) {
    const needle = q.toLowerCase();
    const projects: SearchProjectHit[] = mockProjects
      .filter(
        (p) =>
          !needle ||
          p.repo_full_name.toLowerCase().includes(needle) ||
          p.summary.toLowerCase().includes(needle)
      )
      .slice(0, LIMIT)
      .map((p) => ({ id: p.id, repo_full_name: p.repo_full_name, status: p.status, summary: p.summary }));
    return NextResponse.json({ projects, sample: true });
  }

  try {
    const supabase = createClient();
    let query = supabase
      .from('projects')
      .select('id, repo_full_name, status, summary')
      .eq('user_id', user.uid)
      .order('created_at', { ascending: false })
      .limit(LIMIT);

    if (q) {
      // Escape LIKE wildcards so the query is matched literally.
      const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      query = query.ilike('repo_full_name', pattern);
    }

    const { data, error } = await query;
    if (error) throw error;

    const projects: SearchProjectHit[] = (data || []).map((p) => {
      const s = p.summary as unknown;
      const summary =
        typeof s === 'string'
          ? s
          : s && typeof s === 'object' && typeof (s as { oneLiner?: unknown }).oneLiner === 'string'
            ? (s as { oneLiner: string }).oneLiner
            : null;
      return { id: p.id as string, repo_full_name: p.repo_full_name as string, status: p.status as string, summary };
    });

    return NextResponse.json({ projects, sample: false });
  } catch (err) {
    console.error('[search] failed', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
