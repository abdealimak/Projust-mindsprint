import React from 'react';
import { getCommonProjects } from '@/lib/data';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PeopleIcon } from '@primer/octicons-react';

export default async function ExplorePage() {
  const commonProjects = await getCommonProjects();

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Explore Common Projects</h1>
        <p className="text-[13px] text-fg-muted mt-0.5">
          Learn-by-building tracks for production-grade projects commonly tested by startups and tech companies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {commonProjects.map((project) => (
          <Card key={project.id} className="flex flex-col justify-between p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={project.difficulty === 'Beginner' ? 'success' : project.difficulty === 'Intermediate' ? 'accent' : 'purple'}>
                  {project.difficulty}
                </Badge>
                <span className="text-[11px] text-fg-muted font-mono">
                  ~{project.estimated_hours}h estimated
                </span>
              </div>

              <div>
                <h3 className="text-[15px] font-semibold text-fg mb-1">
                  {project.title}
                </h3>
                <p className="text-[12px] text-fg-muted leading-relaxed">
                  {project.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded bg-canvas border border-border text-fg-muted font-mono"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-fg-muted flex items-center gap-1">
                <PeopleIcon className="w-3.5 h-3.5" />
                {project.enrolled_count} learners
              </span>
              <Button size="sm" variant="default">
                Start Track
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
