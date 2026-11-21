import React from 'react';
import Link from 'next/link';
import { CourseProgress } from '@/types';
import { Card, CardHeader } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Misc';
import { BookIcon, TrophyIcon, CommentDiscussionIcon, GlobeIcon } from '@primer/octicons-react';

export function YourCourses({ courses }: { courses: CourseProgress[] }) {
  return (
    <>
      <Card className="mb-4">
        <CardHeader
          title={
            <div className="flex items-center gap-1.5">
              <BookIcon className="w-4 h-4 text-fg-muted" />
              <span>Your courses</span>
            </div>
          }
        />
        <div className="divide-y divide-border/50">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses`}
              className="block p-3 hover:bg-canvas-inset transition-colors group"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-[12px] font-semibold text-fg group-hover:text-accent leading-snug">
                  {course.course_title}
                </span>
                <span className="text-[11px] font-mono text-fg-muted font-medium shrink-0">
                  {course.progress_percent}%
                </span>
              </div>
              <p className="text-[11px] text-fg-muted truncate mb-2">
                {course.project_name} · {course.current_subtopic}
              </p>
              <ProgressBar value={course.progress_percent} />
            </Link>
          ))}
        </div>
      </Card>

      {/* Quick shortcuts */}
      <Card>
        <CardHeader title="Shortcuts" />
        <div className="p-2 space-y-1 text-[13px]">
          <Link
            href="/certificates"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] hover:bg-canvas-inset text-fg-muted hover:text-fg transition-colors"
          >
            <TrophyIcon className="w-4 h-4 text-fg-muted" />
            <span>Certificates repository</span>
          </Link>
          <Link
            href="/tutor"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] hover:bg-canvas-inset text-fg-muted hover:text-fg transition-colors"
          >
            <CommentDiscussionIcon className="w-4 h-4 text-fg-muted" />
            <span>Project Tutor Chat</span>
          </Link>
          <Link
            href="/explore"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] hover:bg-canvas-inset text-fg-muted hover:text-fg transition-colors"
          >
            <GlobeIcon className="w-4 h-4 text-fg-muted" />
            <span>Explore Common Projects</span>
          </Link>
        </div>
      </Card>
    </>
  );
}
