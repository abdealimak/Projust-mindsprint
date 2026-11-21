import React from 'react';
import Link from 'next/link';
import { CommonProjectCourse } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { GlobeIcon } from '@primer/octicons-react';

export function ExploreCard({ courses }: { courses: CommonProjectCourse[] }) {
  return (
    <Card>
      <CardHeader
        title={
          <div className="flex items-center gap-1.5">
            <GlobeIcon className="w-4 h-4 text-fg-muted" />
            <span>Explore common projects</span>
          </div>
        }
        action={
          <Link href="/explore" className="text-[12px] text-accent hover:underline">
            Browse
          </Link>
        }
      />
      <div className="divide-y divide-border/50">
        {courses.slice(0, 3).map((course) => (
          <div key={course.id} className="p-3 hover:bg-canvas-inset transition-colors">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[12px] font-semibold text-fg hover:text-accent cursor-pointer line-clamp-1">
                {course.title}
              </h4>
              <Badge variant="default" size="sm">
                {course.difficulty}
              </Badge>
            </div>
            <p className="text-[11px] text-fg-muted line-clamp-2 mb-2 leading-snug">
              {course.description}
            </p>
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex flex-wrap gap-1">
                {course.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded bg-canvas text-fg-muted border border-border text-[10px]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <Link href="/explore" className="text-accent hover:underline text-[11px]">
                View &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
