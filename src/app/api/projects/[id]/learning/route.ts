import { NextResponse } from 'next/server';
import { projectCtx, json, fail } from '@/lib/brain/route';
import { learningSummaries } from '@/lib/brain/service';
import { demoSummaries, DEMO_REPO } from '@/lib/brain/demo';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await projectCtx(params.id);
  if (ctx instanceof NextResponse) return ctx;
  try {
    if (ctx.kind === 'demo') return json(demoSummaries(ctx.user.uid, [{ id: ctx.projectId, repo_full_name: DEMO_REPO }])[0]);
    const all = await learningSummaries(ctx.user.uid);
    const one = all.find((s) => s.project_id === ctx.projectId);
    return one ? json(one) : json({ error: 'Project not found' }, 404);
  } catch (err) {
    return fail(err);
  }
}
