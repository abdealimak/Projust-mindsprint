import { Octokit } from '@octokit/rest';

export interface OwnershipResult {
  ownershipPct: number;
  ownershipStatus: 'verified' | 'partial' | 'not_owner' | 'unknown';
  isFork: boolean;
  isSingleCommit: boolean;
  totalCommits: number;
}

export async function checkOwnership(
  octokit: Octokit,
  owner: string,
  repo: string,
  username?: string | null
): Promise<OwnershipResult> {
  let isFork = false;
  let isSingleCommit = false;
  let totalCommits = 0;
  let userCommits = 0;

  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    isFork = repoData.fork;
  } catch (err) {
    console.error('Failed to get repo metadata in ownership check:', err);
  }

  try {
    // Check contributor commits
    const { data: contributors } = await octokit.repos.listContributors({
      owner,
      repo,
      per_page: 50,
    });

    if (contributors && Array.isArray(contributors)) {
      totalCommits = contributors.reduce((sum, c) => sum + (c.contributions || 0), 0);
      if (totalCommits === 1) {
        isSingleCommit = true;
      }

      if (username) {
        const userContrib = contributors.find(
          (c) => c.login?.toLowerCase() === username.toLowerCase()
        );
        if (userContrib) {
          userCommits = userContrib.contributions || 0;
        }
      }
    }
  } catch (err) {
    console.error('Failed to list contributors:', err);
  }

  // Calculate percentage
  let pct = 0;
  if (totalCommits > 0) {
    pct = Math.round((userCommits / totalCommits) * 100);
  }

  let status: 'verified' | 'partial' | 'not_owner' | 'unknown' = 'unknown';
  if (username && totalCommits > 0) {
    if (owner.toLowerCase() === username.toLowerCase() || pct >= 50) {
      status = 'verified';
    } else if (pct >= 10) {
      status = 'partial';
    } else {
      status = 'not_owner';
    }
  }

  return {
    ownershipPct: pct,
    ownershipStatus: status,
    isFork,
    isSingleCommit,
    totalCommits,
  };
}
