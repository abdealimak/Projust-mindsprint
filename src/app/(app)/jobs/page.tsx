import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BriefcaseIcon, LocationIcon, ClockIcon } from '@primer/octicons-react';

export default function JobsPage() {
  const mockJobs = [
    {
      title: 'Backend Engineer (Payments & Infrastructure)',
      company: 'PayFlow Tech',
      location: 'Remote (Global)',
      type: 'Full-time',
      experience: '0-2 years (Early Career)',
      verifiedCourse: 'Shop API & Idempotent Payments Course',
      description:
        'PayFlow is hiring engineers who understand webhook replay attacks, idempotency key guarantees, and database transaction boundaries.',
    },
    {
      title: 'Full Stack Engineer (Realtime Collaboration)',
      company: 'SyncLayer',
      location: 'San Francisco, CA / Remote',
      type: 'Full-time',
      experience: 'Fresh Graduate / Junior',
      verifiedCourse: 'Realtime WebSockets & Concurrency Course',
      description:
        'Looking for honest builders who can explain their state management, websocket heartbeats, and optimistic UI conflict resolution.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Verified Job Openings</h1>
        <p className="text-[13px] text-fg-muted mt-0.5">
          Companies hiring developers based on verified project comprehension rather than resume buzzwords.
        </p>
      </div>

      <div className="space-y-4">
        {mockJobs.map((job, idx) => (
          <Card key={idx} className="p-4 hover:border-accent/40 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[16px] font-semibold text-fg">{job.title}</h3>
                  <Badge variant="accent">{job.company}</Badge>
                </div>

                <div className="flex items-center gap-4 text-[12px] text-fg-muted flex-wrap">
                  <span className="flex items-center gap-1">
                    <LocationIcon className="w-3.5 h-3.5" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <BriefcaseIcon className="w-3.5 h-3.5" />
                    {job.type}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {job.experience}
                  </span>
                </div>

                <p className="text-[13px] text-fg-muted leading-relaxed max-w-3xl">
                  {job.description}
                </p>

                <div className="pt-1">
                  <span className="text-[11px] font-mono text-accent">
                    Required verification: {job.verifiedCourse}
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex items-center sm:flex-col gap-2">
                <Button variant="primary" size="md">
                  Apply with Projust
                </Button>
                <Button variant="default" size="sm">
                  View Briefing
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
