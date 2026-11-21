import { Octokit } from '@octokit/rest';
import { decryptToken } from '@/lib/crypto';
import { createClient } from '@/lib/supabase/server';

export class GithubNotConnectedError extends Error {
  constructor(message = 'GitHub account not connected for repository access') {
    super(message);
    this.name = 'GithubNotConnectedError';
  }
}

/**
 * Server-only helper to obtain an authenticated Octokit instance for a user.
 * Decrypts the stored AES-256-GCM token from github_connections.
 * Never exposes the token to client components.
 */
export async function getGithubClient(userId?: string): Promise<{ octokit: Octokit; isUserToken: boolean }> {
  if (userId) {
    try {
      const supabase = createClient();
      const { data: connection } = await supabase
        .from('github_connections')
        .select('access_token_enc')
        .eq('user_id', userId)
        .maybeSingle();

      if (connection?.access_token_enc) {
        const token = decryptToken(connection.access_token_enc);
        return {
          octokit: new Octokit({ auth: token }),
          isUserToken: true,
        };
      }
    } catch (err) {
      console.error('Error fetching github connection:', err);
    }
  }

  // Fallback to server token if available (for public repos)
  if (process.env.GITHUB_SERVER_TOKEN) {
    return {
      octokit: new Octokit({ auth: process.env.GITHUB_SERVER_TOKEN }),
      isUserToken: false,
    };
  }

  // Fallback unauthenticated Octokit (subject to low 60 req/hr rate limits)
  return {
    octokit: new Octokit(),
    isUserToken: false,
  };
}
