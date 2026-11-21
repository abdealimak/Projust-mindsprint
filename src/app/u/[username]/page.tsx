import React from 'react';
import Link from 'next/link';
import { getProfile, getScores, getCertificates } from '@/lib/data';
import { Avatar } from '@/components/ui/Misc';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AspectRadar } from '@/components/charts/AspectRadar';
import {
  MarkGithubIcon,
  ShieldCheckIcon,
  RepoIcon,
  CheckCircleFillIcon,
} from '@primer/octicons-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default async function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const [profile, scores, certificates] = await Promise.all([
    getProfile(),
    getScores(),
    getCertificates(),
  ]);

  const overall = Math.round(
    (scores.concept_understanding +
      scores.code_comprehension +
      scores.debugging +
      scores.architecture_design +
      scores.security_best_practices +
      scores.ai_collaboration) / 6
  );

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-fg">
      <Header profile={profile} />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Profile Header card */}
        <div className="p-6 rounded-[8px] border border-border bg-canvas-subtle">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={profile.avatar_url}
                fallback={params.username[0]?.toUpperCase()}
                size="xl"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight text-fg">
                    {profile.full_name || params.username}
                  </h1>
                  <span className="text-[14px] text-fg-muted font-mono">
                    @{params.username}
                  </span>
                </div>
                <p className="text-[13px] text-fg-muted mt-1 max-w-xl">
                  {profile.headline || 'Software Engineer · Verified builder'}
                </p>

                {/* Trust Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge variant="accent">
                    <MarkGithubIcon className="w-3.5 h-3.5 mr-1" /> GitHub Verified
                  </Badge>
                  <Badge variant="success">
                    <ShieldCheckIcon className="w-3.5 h-3.5 mr-1" /> 86%+ Ownership
                  </Badge>
                  {profile.linkedin_url && (
                    <Badge variant="default">LinkedIn Connected</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Overall Projust Score badge */}
            <div className="text-center p-3 rounded-[6px] border border-border bg-canvas sm:min-w-[130px]">
              <span className="text-3xl font-mono font-extrabold text-accent">
                {overall}
              </span>
              <p className="text-[10px] text-fg-muted uppercase tracking-wider font-semibold mt-0.5">
                Projust Index
              </p>
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 pt-4 border-t border-border text-[13px] text-fg leading-relaxed">
              {profile.bio}
            </p>
          )}
        </div>

        {/* 2-Column: Radar + Verified Projects */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Skill Radar */}
          <Card className="p-4 flex flex-col justify-between">
            <CardHeader title="Combined Skill Radar" />
            <div className="my-2">
              <AspectRadar scores={scores} height={260} />
            </div>
            <div className="text-[11px] text-fg-muted text-center">
              Evaluated across {certificates.length} repositories with automated quiz & viva verifications.
            </div>
          </Card>

          {/* Verified Projects Cards */}
          <Card>
            <CardHeader title="Verified Projects & Certificates" />
            <div className="divide-y divide-border/50">
              {certificates.map((cert) => (
                <div key={cert.id} className="p-4 hover:bg-canvas-inset transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg text-[14px] flex items-center gap-1.5">
                      <RepoIcon className="w-4 h-4 text-fg-muted" />
                      {cert.project_name}
                    </span>
                    <Badge variant={cert.level === 'Interview-verified' ? 'purple' : 'success'}>
                      {cert.level}
                    </Badge>
                  </div>
                  <p className="text-[12px] font-mono text-fg-muted">{cert.repo_full_name}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[12px] text-fg-muted">
                      Score: <strong className="text-fg">{cert.overall_score}/100</strong>
                    </span>
                    <Link href={`/cert/${cert.cert_code}`}>
                      <Button size="sm" variant="default">
                        View Certificate &rarr;
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Mastered Concepts Tag Cloud */}
        <Card className="p-4">
          <CardHeader title="Concepts Mastered" />
          <div className="flex flex-wrap gap-2 pt-3">
            {[
              { name: 'Idempotency Keys', cat: 'Architecture' },
              { name: 'Webhook Signatures', cat: 'Security' },
              { name: 'Sliding-Window Rate Limiting', cat: 'Distributed Systems' },
              { name: 'Cookie-Based Session Auth', cat: 'Security' },
              { name: 'Optimistic UI Updates', cat: 'Frontend' },
              { name: 'WebSocket Heartbeats', cat: 'Networking' },
              { name: 'Partition Consumer Groups', cat: 'Performance' },
              { name: 'AI Discernment & Prompt Auditing', cat: 'AI Collaboration' },
            ].map((concept, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-full border border-border bg-canvas text-[12px] text-fg flex items-center gap-1"
              >
                <CheckCircleFillIcon className="w-3 h-3 text-success" />
                <span>{concept.name}</span>
                <span className="text-[10px] text-fg-muted font-mono ml-1">({concept.cat})</span>
              </span>
            ))}
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
