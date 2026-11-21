import React, { Suspense } from 'react';
import { getProjects } from '@/lib/data';
import { TutorClient, type TutorProject } from './TutorClient';

export default async function TutorPage() {
  const projects = await getProjects();
  const list: TutorProject[] = projects.map((p) => ({ id: p.id, repo_full_name: p.repo_full_name }));

  return (
    <Suspense
      fallback={
        <div className="px-4 sm:px-10 lg:px-14 pt-8 pb-16 sm:pt-10 lg:pt-12 max-w-[1240px] mx-auto w-full text-muted text-[15px]">
          Loading the tutor…
        </div>
      }
    >
      <TutorClient projects={list} />
    </Suspense>
  );
}
