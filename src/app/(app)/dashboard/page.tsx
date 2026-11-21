import React from 'react';
import Link from 'next/link';
import { getProfile, getProjects, getLearningSummaries, getCertificates } from '@/lib/data';
import { PromptBar } from '@/components/dashboard/PromptBar';
import { ProjectsPanel } from '@/components/dashboard/ProjectsPanel';
import { NextStepCard } from '@/components/dashboard/NextStepCard';
import { featuredSummary } from '@/components/dashboard/journey';
import { FolderGit2, MessagesSquare, GraduationCap, Award, ArrowUpRight } from 'lucide-react';

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export default async function DashboardPage() {
  const [profile, projects, summaries, certificates] = await Promise.all([
    getProfile(),
    getProjects(),
    getLearningSummaries(),
    getCertificates(),
  ]);

  const firstName = profile.full_name ? profile.full_name.split(' ')[0] : profile.username;
  const isDemo = profile.id.startsWith('demo:');
  const courses = summaries.filter((s) => s.course);
  const lessonsDone = courses.reduce((t, s) => t + (s.course?.lessons_done ?? 0), 0);
  const featured = featuredSummary(summaries);

  // Tile colours are the landing's accent set: lime, sky, mint, orange (as soft tints).
  const actions = [
    {
      href: '/projects/new',
      icon: FolderGit2,
      title: 'Import a repository',
      body: 'Paste a GitHub link. We read the code and check how much of it you wrote.',
      stat: plural(projects.length, 'project'),
      tile: 'bg-[#EEF7C8] text-[#3F6212]',
    },
    {
      href: '/tutor',
      icon: MessagesSquare,
      title: 'Ask the tutor',
      body: 'Questions about your own code, answered with the exact lines.',
      stat: 'Cites file and line',
      tile: 'bg-[#E3EEFF] text-[#1F4E8C]',
    },
    {
      href: '/courses',
      icon: GraduationCap,
      title: 'Courses & quizzes',
      body: 'Lessons written from your repository, then a quiz that scores six skills.',
      stat: courses.length ? `${plural(courses.length, 'course')}, ${plural(lessonsDone, 'lesson')} done` : 'No course yet',
      tile: 'bg-[#DDF3E8] text-[#1F5940]',
    },
    {
      href: '/certificates',
      icon: Award,
      title: 'Certificates',
      body: 'A public link anyone can open to check your scores.',
      stat: certificates.length ? `${certificates.length} issued` : 'None yet',
      tile: 'bg-[#FFE6D9] text-[#963A12]',
    },
  ];

  return (
    <div className="flex flex-col xl:flex-row min-h-full">
      <div className="flex-1 min-w-0 px-4 sm:px-10 lg:px-14 pt-8 pb-12 sm:pt-10 lg:pt-14">
        <div className="max-w-[880px] mx-auto">
          <span className="pj-eyebrow">Your workspace</span>
          <h1 className="pj-display text-[clamp(36px,4.4vw,58px)] leading-[1.02] mt-4 sm:mt-5 max-w-[18ch] text-balance">
            Welcome back, {firstName}. <em>What do you want to understand today?</em>
          </h1>
          <p className="mt-4 sm:mt-5 text-[16px] sm:text-[17px] leading-relaxed text-muted max-w-[54ch]">
            Import a project, learn the parts you leaned on AI for, and earn a certificate scored on six skills.
          </p>

          {isDemo && (
            <div className="mt-5 inline-flex items-start gap-2.5 text-[13.5px] text-ink-2 px-3.5 py-2.5 rounded-2xl bg-sheet border border-line">
              <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-tangerine shrink-0" aria-hidden />
              <p>
                You are in a demo with a sample project.{' '}
                <Link href="/login" className="font-medium text-ink underline underline-offset-2 decoration-line-2 hover:decoration-ink">
                  Sign in to use your own repos
                </Link>
              </p>
            </div>
          )}

          <div className="mt-8 sm:mt-10">
            <PromptBar />
          </div>

          <div className="mt-8 sm:mt-10">
            <NextStepCard summary={featured} sample={isDemo} />
          </div>

          <section aria-labelledby="shortcuts-title" className="mt-10 sm:mt-12">
            <h2 id="shortcuts-title" className="pj-section-title">
              Shortcuts
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
              {actions.map(({ href, icon: Icon, title, body, stat, tile }) => (
                <Link
                  key={href}
                  href={href}
                  className="group pj-card pj-card-hover p-4 sm:p-5 flex items-center sm:items-start gap-4"
                >
                  <div className={`w-11 h-11 rounded-[14px] grid place-items-center shrink-0 ${tile}`}>
                    <Icon className="w-5 h-5" strokeWidth={1.8} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[16px] font-semibold tracking-[-0.01em] flex items-center gap-1.5">
                      {title}
                      <ArrowUpRight
                        className="w-4 h-4 text-muted transition-transform duration-300 ease-land group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden
                      />
                    </h3>
                    <p className="hidden sm:block text-[14px] text-muted mt-1 leading-snug">{body}</p>
                    <p className="mt-1 sm:mt-3 text-[13px] sm:text-[12.5px] text-muted sm:text-ink-2 sm:font-medium">{stat}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <ProjectsPanel projects={projects} summaries={summaries} />
    </div>
  );
}
