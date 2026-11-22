import { NextResponse } from 'next/server';
import { withUserAI } from '@/lib/ai/user-settings';
import { projectCtx, json, fail, readJson } from '@/lib/brain/route';
import { getConcepts, startConcepts } from '@/lib/brain/service';
import { demoConcepts, demoStartConcepts } from '@/lib/brain/demo';

/** AI jobs started here can run for minutes (serverless hosts stop functions at this limit). */
export const maxDuration = 300;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await projectCtx(params.id);
  if (ctx instanceof NextResponse) return ctx;
  try {
    return json(ctx.kind === 'demo' ? demoConcepts(ctx.user.uid) : await getConcepts(ctx.projectId));
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await projectCtx(params.id);
  if (ctx instanceof NextResponse) return ctx;
  const { regenerate } = await readJson<{ regenerate?: boolean }>(req);
  try {
    return json(ctx.kind === 'demo' ? demoStartConcepts(ctx.user.uid) : await withUserAI(() => startConcepts(ctx.projectId, ctx.user.uid, Boolean(regenerate))));
  } catch (err) {
    return fail(err);
  }
}
