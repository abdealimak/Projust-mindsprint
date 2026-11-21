import React from 'react';
import Link from 'next/link';
import { getProfile, getProjects, getCourses, getCertificates } from '@/lib/data';
import { PromptBar } from '@/components/dashboard/PromptBar';
import { ProjectsPanel } from '@/components/dashboard/ProjectsPanel';
import { FolderGit2, Sparkles, GraduationCap, Award, Plus } from 'lucide-react';

export default async function DashboardPage() {
  const [profile, projects, courses, certificates] = await Promise.all([
    getProfile(),
    getProjects(),
    getCourses(),
    getCertificates(),
  ]);

  const firstName = profile.full_name ? profile.full_name.split(' ')[0] : profile.username;

  return (
    <div className="flex flex-col lg:flex-row min-h-full">
      {/* Center Stage: Hero, Action Cards, Interactive Prompt Bar */}
      <div className="flex-1 p-6 sm:p-10 lg:p-12 flex flex-col justify-between max-w-4xl mx-auto w-full">
        <div className="my-auto py-6">
          {/* Hero Welcome Heading */}
          <div className="text-center max-w-xl mx-auto mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white mb-3">
              Welcome to Projust{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Verify real developer project comprehension with AI viva defense, interactive quizzes, and certified skill radars. Not sure where to start?
            </p>
          </div>

          {/* 4 Colored Action Cards in a 2x2 Grid (Script.io inspo style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
            {/* Card 1: Warm Amber / Import Repository */}
            <Link
              href="/projects/new"
              className="flex items-center justify-between p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161a26] hover:border-amber-300 dark:hover:border-amber-600/50 hover:shadow-md transition group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                    Import repository
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Analyze code AST & commit graph
                  </p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-amber-500 group-hover:text-white transition shrink-0">
                <Plus className="w-4 h-4" />
              </div>
            </Link>

            {/* Card 2: Soft Sky Blue / Start AI Viva */}
            <Link
              href="/tutor"
              className="flex items-center justify-between p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161a26] hover:border-sky-300 dark:hover:border-sky-600/50 hover:shadow-md transition group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                    Start AI Viva
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Oral architecture defense & grill
                  </p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-sky-500 group-hover:text-white transition shrink-0">
                <Plus className="w-4 h-4" />
              </div>
            </Link>

            {/* Card 3: Soft Lime Green / Codebase Quiz */}
            <Link
              href="/courses"
              className="flex items-center justify-between p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161a26] hover:border-emerald-300 dark:hover:border-emerald-600/50 hover:shadow-md transition group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    Codebase quiz
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {courses.length} courses with active drills
                  </p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-emerald-500 group-hover:text-white transition shrink-0">
                <Plus className="w-4 h-4" />
              </div>
            </Link>

            {/* Card 4: Soft Rose Pink / View Certificates */}
            <Link
              href="/certificates"
              className="flex items-center justify-between p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161a26] hover:border-rose-300 dark:hover:border-rose-600/50 hover:shadow-md transition group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">
                    View certificates
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {certificates.length} verified credentials issued
                  </p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-rose-500 group-hover:text-white transition shrink-0">
                <Plus className="w-4 h-4" />
              </div>
            </Link>
          </div>

          {/* Bottom Floating Prompt / Viva Input Bar */}
          <PromptBar />
        </div>
      </div>

      {/* Right Column: Projects List Panel (Script.io style) */}
      <ProjectsPanel projects={projects} />
    </div>
  );
}
