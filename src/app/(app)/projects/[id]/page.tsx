'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ExternalLink,
  RefreshCw,
  Trash2,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import { IngestionStepper } from '@/components/project/IngestionStepper';
import { OverviewTab } from '@/components/project/OverviewTab';
import { FilesTab } from '@/components/project/FilesTab';
import { AskTab } from '@/components/project/AskTab';
import { ProjectSummary } from '@/lib/ai/schemas';

interface ProjectDetails {
  id: string;
  repo_full_name: string;
  repo_url: string;
  status: string;
  status_detail: string;
  default_branch: string;
  commit_sha?: string;
  primary_language?: string;
  ownership_pct?: number;
  ownership_status?: string;
  file_count?: number;
  summary?: ProjectSummary | null;
}

export default function ProjectWorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;

  type TabType = 'overview' | 'files' | 'ask' | 'concepts' | 'course' | 'cert';
  const paramTab = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(paramTab || 'overview');

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [files, setFiles] = useState<{ path: string; language: string; size_bytes: number; line_count: number; content: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Pre-filled question from starter chips
  const [askQuestion, setAskQuestion] = useState<string | null>(searchParams.get('q'));

  const fetchProjectData = React.useCallback(async () => {
    try {
      const [statusRes, filesRes] = await Promise.all([
        fetch(`/api/projects/${id}/status`),
        fetch(`/api/projects/${id}/files`),
      ]);
      if (statusRes.ok) {
        const data = await statusRes.json();
        setProject(data);
      }
      if (filesRes.ok) {
        const fData = await filesRes.json();
        if (fData.files) setFiles(fData.files);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  const handleResync = async () => {
    if (!confirm('Re-sync repository and update architectural summary?')) return;
    await fetch(`/api/projects/${id}`, { method: 'POST' });
    fetchProjectData();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project and all its indexed files?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    router.push('/projects');
  };

  const handleAskStarterQuestion = (q: string) => {
    setAskQuestion(q);
    setActiveTab('ask');
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-neutral-400 animate-pulse">
        Loading project workspace...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Project Not Found</h2>
        <Link href="/projects" className="text-xs text-blue-500 hover:underline">
          &larr; Back to all projects
        </Link>
      </div>
    );
  }

  const isReady = project.status === 'ready';

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {project.repo_full_name}
            </h1>

            {/* Ownership Badge */}
            {project.ownership_pct !== undefined && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300/40">
                <ShieldCheck className="w-3 h-3" />
                <span>
                  {project.ownership_status === 'verified'
                    ? `Verified Author · ${project.ownership_pct}% of commits`
                    : `${project.ownership_pct}% commits`}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 font-mono">
              <GitBranch className="w-3 h-3" />
              {project.default_branch || 'main'}
            </span>
            {project.commit_sha && (
              <span className="font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                {project.commit_sha.slice(0, 7)}
              </span>
            )}
            {project.primary_language && (
              <span>• {project.primary_language}</span>
            )}
            {project.file_count !== undefined && (
              <span>• {project.file_count} files indexed</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={project.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium transition flex items-center gap-1.5"
            title="Open on GitHub"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>

          <button
            type="button"
            onClick={handleResync}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            title="Re-sync repository"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Re-sync</span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="p-2 rounded-xl border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium transition cursor-pointer"
            title="Delete project"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Underlined GitHub-style Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 text-xs font-medium gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'files'
              ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          Files
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ask')}
          className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'ask'
              ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          Ask (AI Tutor)
        </button>

        <span className="px-4 py-2.5 text-neutral-400 dark:text-neutral-600 border-b-2 border-transparent cursor-not-allowed select-none whitespace-nowrap">
          Concepts <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800">soon</span>
        </span>

        <span className="px-4 py-2.5 text-neutral-400 dark:text-neutral-600 border-b-2 border-transparent cursor-not-allowed select-none whitespace-nowrap">
          Course <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800">soon</span>
        </span>

        <span className="px-4 py-2.5 text-neutral-400 dark:text-neutral-600 border-b-2 border-transparent cursor-not-allowed select-none whitespace-nowrap">
          Certificate <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800">soon</span>
        </span>
      </div>

      {/* Main Tab Content */}
      {!isReady ? (
        <IngestionStepper
          projectId={id}
          initialStatus={project.status}
          initialDetail={project.status_detail}
          onReady={fetchProjectData}
        />
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewTab
              summary={project.summary || null}
              onAskQuestion={handleAskStarterQuestion}
            />
          )}

          {activeTab === 'files' && (
            <FilesTab files={files} />
          )}

          {activeTab === 'ask' && (
            <AskTab
              projectId={id}
              initialQuestion={askQuestion}
              files={files}
            />
          )}
        </>
      )}
    </div>
  );
}
