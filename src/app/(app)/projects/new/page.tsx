'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderGit2,
  Lock,
  Star,
  Search,
  ExternalLink,
  Link as LinkIcon,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

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

  useEffect(() => {
    async function loadRepos() {
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
    }
    loadRepos();
  }, []);

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

  return (
    <div className="px-5 sm:px-10 lg:px-14 py-10 lg:py-12 max-w-[1040px] mx-auto w-full space-y-6">
      <PageHeader
        className="mb-2"
        eyebrow="Import"
        title="Bring a repository."
        em="We'll read it with you."
        description="Pick one from your GitHub account or paste any public GitHub link. We index the code, check your commit share and write a summary."
      />

      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="inline-flex p-1 gap-0.5 rounded-full border border-line bg-sheet text-[14px] font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('picker')}
          className={`flex items-center gap-2 h-9 px-4 rounded-full transition-colors ${
            activeTab === 'picker'
              ? 'bg-olive text-[#F6F8EC] shadow-pill'
              : 'text-ink-2 hover:bg-paper'
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          <span>Your GitHub Repositories</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex items-center gap-2 h-9 px-4 rounded-full transition-colors ${
            activeTab === 'url'
              ? 'bg-olive text-[#F6F8EC] shadow-pill'
              : 'text-ink-2 hover:bg-paper'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>Paste Public Repo URL</span>
        </button>
      </div>

      {/* Tab 1: Repo Picker */}
      {activeTab === 'picker' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-neutral-400 animate-pulse">
              Loading your GitHub repositories...
            </div>
          ) : !connected ? (
            /* Connect GitHub State */
            <div className="p-8 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161a26] text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-900 dark:text-white">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                  Connect GitHub for Repo Access
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                  Authorize Projust to read repository trees and commit histories so you can audit real codebases and earn certified rubrics.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <a
                  href="/api/github/connect?scope=public"
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-xs font-medium transition shadow-xs flex items-center justify-center gap-2"
                >
                  <span>Connect GitHub (Public repos)</span>
                </a>
                <a
                  href="/api/github/connect?scope=private"
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium transition flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Also allow private repos</span>
                </a>
              </div>
            </div>
          ) : (
            /* Search & Repo List */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search repositories..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-[#161a26] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>

                <div className="flex items-center gap-3 text-xs text-neutral-500 w-full sm:w-auto justify-between sm:justify-end">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hideForks}
                      onChange={(e) => setHideForks(e.target.checked)}
                      className="rounded border-neutral-300"
                    />
                    <span>Hide forks</span>
                  </label>
                  <span>{filteredRepos.length} repositories</span>
                </div>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-[#161a26] divide-y divide-neutral-100 dark:divide-neutral-800/80 overflow-hidden">
                {filteredRepos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-400">
                    No repositories found matching your filter.
                  </div>
                ) : (
                  filteredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/50 dark:hover:bg-[#1a2030]/50 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-xs text-neutral-900 dark:text-white truncate">
                            {repo.fullName}
                          </span>
                          {repo.isPrivate ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              <Lock className="w-2.5 h-2.5" /> Private
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              Public
                            </span>
                          )}
                          {repo.isFork && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                              Fork
                            </span>
                          )}
                        </div>

                        {repo.description && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mb-1.5">
                            {repo.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                          {repo.language && (
                            <span className="flex items-center gap-1 font-medium">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              {repo.language}
                            </span>
                          )}
                          {repo.stars > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {repo.stars}
                            </span>
                          )}
                          <span>
                            Updated {new Date(repo.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                          title="Open on GitHub"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <button
                          type="button"
                          disabled={importingRepo === repo.fullName}
                          onClick={() => handleImport(repo.fullName)}
                          className="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                        >
                          {importingRepo === repo.fullName ? (
                            <span>Importing...</span>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Import</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Paste Public Repo URL */}
      {activeTab === 'url' && (
        <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161a26] space-y-4 max-w-xl mx-auto">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Import via Public GitHub URL
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Paste the link of any public GitHub repository (e.g. <code>https://github.com/facebook/react</code> or your own project).
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleImport(undefined, publicUrl.trim());
            }}
            className="space-y-3"
          >
            <div>
              <label htmlFor="repoUrl" className="sr-only">GitHub URL</label>
              <input
                id="repoUrl"
                type="url"
                required
                value={publicUrl}
                onChange={(e) => setPublicUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#0c0e14] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>

            <button
              type="submit"
              disabled={urlImporting || !publicUrl.trim()}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {urlImporting ? 'Ingesting repository...' : 'Import Repository'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
