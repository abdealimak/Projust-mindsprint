import { NextResponse } from 'next/server';
import { withUserAI } from '@/lib/ai/user-settings';
import { projectCtx, json, fail } from '@/lib/brain/route';
import { listAttempts, startAttempt } from '@/lib/brain/service';
import { demoAttempts, demoStartAttempt } from '@/lib/brain/demo';

/** AI jobs started here can run for minutes (serverless hosts stop functions at this limit). */
export const maxDuration = 300;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await projectCtx(params.id);
  if (ctx instanceof NextResponse) return ctx;
  try {
    return json({ attempts: ctx.kind === 'demo' ? demoAttempts(ctx.user.uid) : await listAttempts(ctx.projectId, ctx.user.uid) });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await projectCtx(params.id);
  if (ctx instanceof NextResponse) return ctx;
  try {
    if (ctx.kind === 'demo') {
      const r = demoStartAttempt(ctx.user.uid);
      return 'error' in r ? json({ error: r.error }, r.status) : json({ attempt: r });
    }
    return json({ attempt: await withUserAI(() => startAttempt(ctx.projectId, ctx.user.uid)) });
  } catch (err) {
    return fail(err);
  }
}
