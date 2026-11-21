import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGithubClient, GithubNotConnectedError } from '@/lib/github/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const q = (searchParams.get('q') || '').toLowerCase().trim();

  const cookieStore = cookies();
  const userCookie = cookieStore.get('projust_user')?.value;
  const mockCookie = cookieStore.get('projust_mock_user')?.value;
  let userId: string | undefined;
  if (userCookie) {
    try {
      const parsed = JSON.parse(userCookie);
      userId = parsed.uid;
    } catch {
      // ignore
    }
  }
  if (!userId && mockCookie) {
    userId = mockCookie;
  }

  try {
    const { octokit, isUserToken } = await getGithubClient(userId);

    if (!isUserToken) {
      return NextResponse.json({
        connected: false,
        repos: [],
        message: 'Connect your GitHub account to import private or personal repositories.',
      });
    }

    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      affiliation: 'owner,collaborator,organization_member',
      sort: 'pushed',
      per_page: 100,
      page,
    });

    let filtered = repos.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner.login,
      description: r.description,
      isPrivate: r.private,
      isFork: r.fork,
      language: r.language,
      stars: r.stargazers_count,
      updatedAt: r.pushed_at || r.updated_at,
      defaultBranch: r.default_branch,
      url: r.html_url,
    }));

    if (q) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.fullName.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      connected: true,
      repos: filtered,
    });
  } catch (err: unknown) {
    if (err instanceof GithubNotConnectedError) {
      return NextResponse.json({ connected: false, repos: [] });
    }
    const msg = err instanceof Error ? err.message : 'Failed to fetch repositories';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
