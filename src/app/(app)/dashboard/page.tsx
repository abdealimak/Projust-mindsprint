import React from 'react';
import Link from 'next/link';
import { getProfile, getProjects, getCourses, getCertificates } from '@/lib/data';
import { PromptBar } from '@/components/dashboard/PromptBar';
import { ProjectsPanel } from '@/components/dashboard/ProjectsPanel';
import { FolderGit2, MessagesSquare, GraduationCap, Award, ArrowUpRight } from 'lucide-react';

export default async function DashboardPage() {
  const [profile, projects, courses, certificates] = await Promise.all([
    getProfile(),
    getProjects(),
    getCourses(),
    getCertificates(),
  ]);

  const firstName = profile.full_name ? profile.full_name.split(' ')[0] : profile.username;

  // Tile colours are the landing's accent set: lime, sky, mint, orange (as soft tints).
  const actions = [
    {
      href: '/projects/new',
      icon: FolderGit2,
      title: 'Import a repository',
      body: 'Paste a GitHub link. We read the code and check that you wrote it.',
      tile: 'bg-[#EEF7C8] text-[#3F6212]',
    },
    {
      href: '/tutor',
      icon: MessagesSquare,
      title: 'Ask the tutor',
      body: 'Questions about your own code, answered with the exact lines.',
      tile: 'bg-[#E3EEFF] text-[#1F4E8C]',
    },
    {
      href: '/courses',
      icon: GraduationCap,
      title: 'Courses & quizzes',
      body: `${courses.length} ${courses.length === 1 ? 'course' : 'courses'} built from your projects.`,
      tile: 'bg-[#DDF3E8] text-[#1F5940]',
    },
    {
      href: '/certificates',
      icon: Award,
      title: 'Certificates',
      body: `${certificates.length} issued. Share a link a recruiter can verify.`,
      tile: 'bg-[#FFE6D9] text-[#963A12]',
    },
  ];

  return (
    <div className="flex flex-col xl:flex-row min-h-full">
      <div className="flex-1 min-w-0 px-5 sm:px-10 lg:px-14 py-10 lg:py-14">
        <div className="max-w-[880px] mx-auto">
          <span className="pj-eyebrow">Your workspace</span>
          <h2 className="pj-display text-[clamp(40px,5vw,68px)] mt-5 max-w-[16ch]">
            Welcome back, {firstName}. <em>What do you want to understand today?</em>
          </h2>
          <p className="mt-5 text-[17px] text-muted max-w-[52ch]">
            Import a project, learn the parts you leaned on AI for, and earn a certificate across six scored skills.
          </p>

          <div className="mt-10">
            <PromptBar />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
            {actions.map(({ href, icon: Icon, title, body, tile }) => (
              <Link
                key={href}
                href={href}
                className="group pj-card pj-card-hover p-5 flex items-start gap-4"
              >
                <div className={`w-11 h-11 rounded-[14px] grid place-items-center shrink-0 ${tile}`}>
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[16px] font-semibold tracking-[-0.01em] flex items-center gap-1.5">
                    {title}
                    <ArrowUpRight className="w-4 h-4 text-muted transition-transform duration-300 ease-land group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </h3>
                  <p className="text-[14px] text-muted mt-1 leading-snug">{body}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <ProjectsPanel projects={projects} />
    </div>
  );
}
