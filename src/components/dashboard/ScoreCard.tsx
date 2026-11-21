import React from 'react';
import Link from 'next/link';
import { AspectScores } from '@/types';
import { AspectRadar } from '@/components/charts/AspectRadar';
import { TrophyIcon, ArrowRightIcon } from '@primer/octicons-react';

export function ScoreCard({ scores }: { scores: AspectScores }) {
  const overall = Math.round(
    (scores.concept_understanding +
      scores.code_comprehension +
      scores.debugging +
      scores.architecture_design +
      scores.security_best_practices +
      scores.ai_collaboration) / 6
  );

  return (
    <div className="rounded-xl border border-border bg-canvas-subtle p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <TrophyIcon className="w-4 h-4 text-accent" />
          <h2 className="text-[14px] font-semibold text-fg">Verification Score</h2>
        </div>
        <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 font-semibold">
          Certified
        </span>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-canvas border border-border/80 my-2">
        <div>
          <div className="text-3xl font-extrabold text-fg font-mono tracking-tight">
            {overall}<span className="text-sm font-normal text-fg-muted">/100</span>
          </div>
          <p className="text-[11px] text-fg-muted font-medium mt-0.5">
            Average Understanding Index
          </p>
        </div>
        <div className="text-right">
          <span className="text-[12px] font-semibold text-success flex items-center gap-1 justify-end">
            +6 pts
          </span>
          <span className="text-[10px] text-fg-muted">since last quiz</span>
        </div>
      </div>

      {/* Radar chart of 6 aspects */}
      <div className="w-full my-1">
        <AspectRadar scores={scores} height={200} />
      </div>

      <div className="pt-2 border-t border-border mt-1">
        <Link
          href="/certificates"
          className="flex items-center justify-center gap-1.5 text-[12px] text-accent hover:underline font-medium w-full text-center"
        >
          <span>View Verified Credentials</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
