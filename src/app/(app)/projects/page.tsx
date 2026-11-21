import React from 'react';
import Link from 'next/link';
import { getProjects } from '@/lib/data';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RepoIcon, SearchIcon, RepoForkedIcon } from '@primer/octicons-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/Misc';

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="px-5 sm:px-10 lg:px-14 py-10 lg:py-12 max-w-[1240px] mx-auto w-full space-y-6">
      <PageHeader
        className="mb-2"
        eyebrow="Projects"
        title="Your repositories,"
        em="read line by line."
        description="Projust checks how much of each repo you wrote, maps its concepts, and builds a course from it."
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Import a GitHub repository to get a summary, a tutor that knows your code and a course built from it."
          action={
            <Link href="/projects/new">
              <Button variant="primary">Import a repository</Button>
            </Link>
          }
        />
      ) : (
      <>
      {/* Filter and stats */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-fg-muted" />
          <input
            type="text"
            placeholder="Search projects…"
            className="w-full bg-canvas-subtle border border-border rounded-[6px] pl-9 pr-3 py-1.5 text-[13px] text-fg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="text-[13px] text-fg-muted">
          Showing <span className="font-semibold text-fg">{projects.length}</span> verified repositories
        </div>
      </div>

      {/* Projects List Card */}
      <Card>
        <CardHeader title="Repository Analysis Status" />
        <div className="divide-y divide-border/50">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-4 hover:bg-canvas-inset transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <RepoIcon className="w-4 h-4 text-fg-muted" />
                  <Link href={`/projects/${project.id}`} className="text-[15px] font-semibold text-accent hover:underline cursor-pointer">
                    {project.repo_full_name}
                  </Link>
                  {project.is_fork && (
                    <Badge variant="default" size="sm">
                      <RepoForkedIcon className="w-3 h-3 mr-0.5" /> Fork
                    </Badge>
                  )}
                  <Badge
                    variant={
                      project.status === 'completed'
                        ? 'success'
                        : project.status === 'analyzing'
                        ? 'attention'
                        : 'accent'
                    }
                  >
                    {project.status}
                  </Badge>
                </div>
                <p className="text-[13px] text-fg-muted leading-relaxed max-w-2xl">
                  {project.summary}
                </p>
                <div className="flex items-center gap-4 text-[12px] text-fg-muted font-mono">
                  <span>Commit: {project.commit_sha}</span>
                  <span>Ownership: {project.ownership_pct}% verified</span>
                  <span>{project.concepts_count || 14} concepts mapped</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/tutor?project=${project.repo_full_name}`}>
                  <Button size="sm" variant="default">
                    Ask Tutor
                  </Button>
                </Link>
                <Link href={`/courses`}>
                  <Button size="sm" variant="primary">
                    View Course
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
      </>
      )}
    </div>
  );
}
