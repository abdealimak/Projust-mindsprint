import React from 'react';
import { getCourses } from '@/lib/data';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Misc';
import { BookIcon, PlayIcon } from '@primer/octicons-react';

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Courses & Quizzes</h1>
        <p className="text-[13px] text-fg-muted mt-0.5">
          Personalized learning tracks and understanding quizzes generated specifically from your codebase concepts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <Card key={course.id} className="flex flex-col justify-between">
            <div>
              <CardHeader
                title={
                  <div className="flex items-center gap-2">
                    <BookIcon className="w-4 h-4 text-fg-muted" />
                    <span className="truncate">{course.project_name}</span>
                  </div>
                }
                action={
                  <span className="text-[11px] font-mono text-fg-muted">
                    {course.progress_percent}%
                  </span>
                }
              />
              <div className="p-4 space-y-3">
                <h3 className="text-[15px] font-semibold text-fg">
                  {course.course_title}
                </h3>
                <p className="text-[13px] text-fg-muted">
                  Current subtopic: <span className="text-fg font-medium">{course.current_subtopic}</span>
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-fg-muted">
                    <span>{course.completed_subtopics} of {course.total_subtopics} subtopics completed</span>
                  </div>
                  <ProgressBar value={course.progress_percent} />
                </div>
              </div>
            </div>

            <div className="p-4 pt-0 flex items-center justify-between border-t border-border mt-2">
              <span className="text-[11px] text-fg-muted font-mono">
                Quizzes score: 6 aspects evaluated
              </span>
              <Button size="sm" variant="primary" icon={<PlayIcon className="w-3 h-3" />}>
                Continue quiz
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
