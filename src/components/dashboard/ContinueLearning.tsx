import React from 'react';
import Link from 'next/link';
import { CourseProgress } from '@/types';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Misc';
import { PlayIcon, RepoIcon } from '@primer/octicons-react';

export function ContinueLearning({ courses }: { courses: CourseProgress[] }) {
  if (courses.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">Active Learning Courses</h2>
          <p className="text-[12px] text-fg-muted">
            Personalized subtopics and quizzes mapped from your repo concepts.
          </p>
        </div>
        <Link href="/courses" className="text-[12px] text-accent hover:underline font-medium">
          View all tracks &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <div
            key={course.id}
            className="flex flex-col justify-between p-4 rounded-xl border border-border bg-canvas-subtle hover:border-accent/40 transition-all shadow-xs group"
          >
            <div>
              <div className="flex items-center justify-between text-[11px] text-fg-muted mb-2">
                <span className="flex items-center gap-1 font-mono text-accent">
                  <RepoIcon className="w-3.5 h-3.5" />
                  {course.project_name}
                </span>
                <span className="font-mono bg-canvas px-2 py-0.5 rounded border border-border">
                  {course.progress_percent}% Complete
                </span>
              </div>

              <h3 className="text-[14px] font-semibold text-fg group-hover:text-accent transition-colors line-clamp-1 mb-1">
                {course.course_title}
              </h3>

              <div className="p-2.5 rounded-lg bg-canvas border border-border/60 my-3">
                <div className="text-[10px] uppercase font-mono tracking-wider text-fg-muted mb-0.5">
                  Current Lesson:
                </div>
                <div className="text-[12px] text-fg font-medium line-clamp-1">
                  {course.current_subtopic}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-fg-muted mb-1.5 font-mono">
                <span>{course.completed_subtopics} / {course.total_subtopics} topics mastered</span>
              </div>
              <ProgressBar value={course.progress_percent} className="h-2 mb-3" />

              <div className="flex justify-end">
                <Link href="/courses">
                  <Button size="sm" variant="primary" icon={<PlayIcon className="w-3 h-3" />}>
                    Resume Quiz
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
