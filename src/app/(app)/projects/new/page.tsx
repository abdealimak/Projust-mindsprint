'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderGit2,
  Lock,
  Star,
  Search,
  ExternalLink,
  Link as LinkIcon,
  Plus,
  Loader2,
  GitFork,
} from 'lucide-react';
import { Page, PageHeader } from '@/components/layout/PageHeader';
import { Callout, Skeleton } from '@/components/ui/Misc';
import { GitHubMark } from '@/components/ui/Button';
import { connectGitHubAccount } from '@/lib/firebase/auth';
import { cn } from '@/lib/utils';

const GITHUB_REPO_RE = /^https?:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s]+/i;

const AFTER_IMPORT = [
  { title: 'We read the code', body: 'A summary of what it does and the files that matter.' },
  { title: 'We check it is yours', body: 'Your share of the commits, so the certificate means something.' },
  { title: 'You learn and get scored', body: 'Concepts, a course from your code, then a quiz on six skills.' },
];

interface RepoItem {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  isFork: boolean;
  language: string | null;
  stars: number;
  updatedAt: string;
  url: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'picker' | 'url'>('picker');

  // State for repo picker
  const [connected, setConnected] = useState<boolean | null>(null);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideForks, setHideForks] = useState(false);
  const [importingRepo, setImportingRepo] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State for public URL tab
  const [publicUrl, setPublicUrl] = useState('');
  const [urlImporting, setUrlImporting] = useState(false);

  // A GitHub link pasted into the dashboard prompt arrives as ?url=
  useEffect(() => {
    const pasted = new URLSearchParams(window.location.search).get('url');
    if (pasted) {
      setPublicUrl(pasted);
      setActiveTab('url');
    }
  }, []);

  const loadRepos = useCallback(async () => {
    try {
      const res = await fetch('/api/github/repos');
      const data = await res.json();
      setConnected(data.connected);
      if (data.repos) {
        setRepos(data.repos);
      }
    } catch (err) {
      console.error('Error fetching repos:', err);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Clean up any stale query params (like old OAuth redirect errors)
    if (typeof window !== 'undefined' && window.location.search.includes('error=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
    loadRepos();
  }, [loadRepos]);

  const handleConnectGitHub = async (scope: 'public' | 'private' = 'public') => {
    setErrorMsg(null);
    setConnecting(true);
    try {
      await connectGitHubAccount(scope);
      await loadRepos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'GitHub connection failed';
      setErrorMsg(msg);
    } finally {
      setConnecting(false);
    }
  };

  const handleImport = async (repoFullName?: string, repoUrl?: string) => {
    setErrorMsg(null);
    const target = repoFullName || repoUrl;
    if (!target) return;

    if (repoFullName) setImportingRepo(repoFullName);
    if (repoUrl) setUrlImporting(true);

    try {
      const res = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName,
          repoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to import repository');
      }

      // Navigate to project workspace
      router.push(`/projects/${data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setErrorMsg(msg);
      setImportingRepo(null);
      setUrlImporting(false);
    }
  };

  const filteredRepos = repos.filter((r) => {
    if (hideForks && r.isFork) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.fullName.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  const trimmedUrl = publicUrl.trim();
  const urlLooksWrong = trimmedUrl.length > 0 && !GITHUB_REPO_RE.test(trimmedUrl);

  return (
    <Page narrow>
      <PageHeader
        eyebrow="Import"
        title="Bring a repository."
        em="We'll read it with you."
        description="Pick one from your GitHub account or paste any public GitHub link. We index the code, check your share of the commits and write a summary."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-8 lg:gap-10 items-start">
        <div className="min-w-0 space-y-5">
          {/* Tabs */}
          <div role="tablist" aria-label="How to import" className="pj-segment w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
            <button
              type="button"
              role="tab"
              id="tab-picker"
              aria-selected={activeTab === 'picker'}
              aria-controls="panel-picker"
              onClick={() => setActiveTab('picker')}
            >
              <FolderGit2 className="w-4 h-4 hidden sm:block" aria-hidden />
              <span className="sm:hidden">Your repos</span>
              <span className="hidden sm:inline">Your GitHub repositories</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-url"
              aria-selected={activeTab === 'url'}
              aria-controls="panel-url"
              onClick={() => setActiveTab('url')}
            >
              <LinkIcon className="w-4 h-4 hidden sm:block" aria-hidden />
              <span className="sm:hidden">Paste a link</span>
              <span className="hidden sm:inline">Paste a public link</span>
            </button>
          </div>

          {errorMsg && (
            <Callout
              tone="error"
              title="That didn't work"
              action={
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-[13px] font-medium underline underline-offset-2"
                >
                  Dismiss
                </button>
              }
            >
              {errorMsg}
            </Callout>
          )}

          {/* Tab 1: Repo Picker */}
          {activeTab === 'picker' && (
            <div role="tabpanel" id="panel-picker" aria-labelledby="tab-picker">
              {loading ? (
                <div className="pj-card divide-y divide-line overflow-hidden" aria-busy="true" aria-label="Loading your GitHub repositories">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className="h-4 w-48 max-w-full" />
                        <Skeleton className="h-3 w-72 max-w-full" />
                      </div>
                      <Skeleton className="h-9 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : !connected ? (
                /* Connect GitHub State */
                <div className="pj-card px-5 py-10 sm:px-10 sm:py-12 text-center">
                  <span className="mx-auto w-12 h-12 rounded-[14px] grid place-items-center bg-paper border border-line text-ink">
                    <GitHubMark className="w-6 h-6" />
                  </span>
                  <h2 className="mt-4 font-serif text-[30px] leading-tight">Connect GitHub</h2>
                  <p className="mt-2 text-[15px] text-muted max-w-[46ch] mx-auto">
                    Projust reads the file tree and commit history of the repos you pick, so it can check which parts you
                    wrote. Nothing is imported until you choose a repo.
                  </p>

                  <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={connecting}
                      onClick={() => handleConnectGitHub('public')}
                      className="pj-btn"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                          Connecting…
                        </>
                      ) : (
                        <>
                          <GitHubMark className="w-4 h-4" />
                          Connect public repos
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={connecting}
                      onClick={() => handleConnectGitHub('private')}
                      className="pj-btn pj-btn-ghost"
                    >
                      <Lock className="w-4 h-4" aria-hidden />
                      Include private repos
                    </button>
                  </div>

                  <p className="mt-6 text-[13.5px] text-muted">
                    Rather not connect?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('url')}
                      className="text-ink font-medium underline underline-offset-2"
                    >
                      Paste a public link instead
                    </button>
                  </p>
                </div>
              ) : (
                /* Search & Repo List */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden />
                      <label htmlFor="repo-search" className="sr-only">
                        Search repositories
                      </label>
                      <input
                        id="repo-search"
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search repositories"
                        className="pj-input pl-10"
                      />
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 text-[13.5px] text-muted">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hideForks}
                          onChange={(e) => setHideForks(e.target.checked)}
                          className="w-4 h-4 rounded border-line-2 accent-[#4A5A1E]"
                        />
                        Hide forks
                      </label>
                      <span className="tabular-nums" aria-live="polite">
                        {filteredRepos.length} {filteredRepos.length === 1 ? 'repository' : 'repositories'}
                      </span>
                    </div>
                  </div>

                  <ul className="pj-card divide-y divide-line overflow-hidden">
                    {filteredRepos.length === 0 ? (
                      <li className="px-6 py-12 text-center">
                        <p className="text-[15px] font-medium text-ink">
                          {repos.length === 0 ? 'No repositories on this GitHub account' : 'No repositories match'}
                        </p>
                        <p className="mt-1 text-[13.5px] text-muted">
                          {repos.length === 0
                            ? 'Push a project to GitHub, or paste a public link to someone else’s repo you worked on.'
                            : 'Try another name, or show forks again.'}
                        </p>
                        {(searchQuery || hideForks) && repos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setHideForks(false);
                            }}
                            className="pj-btn pj-btn-ghost pj-btn-sm mt-4"
                          >
                            Clear filters
                          </button>
                        )}
                      </li>
                    ) : (
                      filteredRepos.map((repo) => {
                        const importing = importingRepo === repo.fullName;
                        return (
                          <li
                            key={repo.id}
                            className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-paper/60 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-mono text-[13.5px] text-ink break-all">{repo.fullName}</span>
                                <span className="inline-flex items-center gap-1 px-2 py-px rounded-full text-[11.5px] border border-line bg-paper text-muted">
                                  {repo.isPrivate && <Lock className="w-3 h-3" aria-hidden />}
                                  {repo.isPrivate ? 'Private' : 'Public'}
                                </span>
                                {repo.isFork && (
                                  <span className="inline-flex items-center gap-1 px-2 py-px rounded-full text-[11.5px] border border-line bg-paper text-muted">
                                    <GitFork className="w-3 h-3" aria-hidden />
                                    Fork
                                  </span>
                                )}
                              </div>

                              {repo.description && (
                                <p className="mt-1 text-[13.5px] text-muted line-clamp-1">{repo.description}</p>
                              )}

                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                                {repo.language && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-olive" aria-hidden />
                                    {repo.language}
                                  </span>
                                )}
                                {repo.stars > 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5" aria-hidden />
                                    {repo.stars}
                                  </span>
                                )}
                                <span>Updated {formatDate(repo.updatedAt)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                              <a
                                href={repo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 grid place-items-center rounded-full text-muted hover:text-ink hover:bg-paper transition-colors"
                                aria-label={`Open ${repo.fullName} on GitHub`}
                                title="Open on GitHub"
                              >
                                <ExternalLink className="w-4 h-4" aria-hidden />
                              </a>
                              <button
                                type="button"
                                disabled={importingRepo !== null}
                                onClick={() => handleImport(repo.fullName)}
                                className="pj-btn pj-btn-sm"
                              >
                                {importing ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                                    Importing…
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4" aria-hidden />
                                    Import
                                  </>
                                )}
                              </button>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Paste Public Repo URL */}
          {activeTab === 'url' && (
            <div role="tabpanel" id="panel-url" aria-labelledby="tab-url" className="pj-card p-5 sm:p-7">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Import from a public GitHub link</h2>
              <p className="mt-1 text-[14px] text-muted">
                Any public repository works, for example{' '}
                <code className="font-mono text-[12.5px] text-ink-2 px-1.5 py-0.5 rounded-md bg-paper border border-line break-all">
                  https://github.com/owner/repository
                </code>
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleImport(undefined, trimmedUrl);
                }}
                className="mt-5 flex flex-col sm:flex-row gap-2"
              >
                <label htmlFor="repoUrl" className="sr-only">
                  GitHub URL
                </label>
                <input
                  id="repoUrl"
                  type="url"
                  required
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  value={publicUrl}
                  onChange={(e) => setPublicUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  aria-invalid={urlLooksWrong || undefined}
                  aria-describedby="repoUrl-hint"
                  className={cn('pj-input flex-1 min-w-0 font-mono text-[14px]', urlLooksWrong && 'border-warn')}
                />
                <button type="submit" disabled={urlImporting || !trimmedUrl} className="pj-btn shrink-0">
                  {urlImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      Importing…
                    </>
                  ) : (
                    'Import repository'
                  )}
                </button>
              </form>
              <p id="repoUrl-hint" className={cn('mt-2 text-[12.5px] pl-4', urlLooksWrong ? 'text-warn' : 'text-muted')}>
                {urlLooksWrong
                  ? 'This does not look like a GitHub repository link. It should start with https://github.com/.'
                  : 'Reading a large repository can take a minute. You can leave the page while it works.'}
              </p>
            </div>
          )}
        </div>

        {/* What happens next */}
        <aside aria-labelledby="after-import" className="rounded-m border border-line bg-paper-2 p-5">
          <h2 id="after-import" className="pj-section-title">
            After you import
          </h2>
          <ol className="mt-4 space-y-4">
            {AFTER_IMPORT.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="w-6 h-6 shrink-0 rounded-full bg-sheet border border-line grid place-items-center font-mono text-[11.5px] text-ink-2">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink">{s.title}</p>
                  <p className="mt-0.5 text-[13px] text-muted leading-snug">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </Page>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
