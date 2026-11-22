import { NextResponse } from 'next/server';
import { withUserAI } from '@/lib/ai/user-settings';
import { projectCtx, json, fail, readJson } from '@/lib/brain/route';
import { getCourse, startCourse } from '@/lib/brain/service';
import { demoConcepts, demoCourse, demoStartCourse } from '@/lib/brain/demo';
import type { Level } from '@/lib/brain/course';

/** AI jobs started here can run for minutes (serverless hosts stop functions at this limit). */
export const maxDuration = 300;

const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await projectCtx(params.id);
  if (ctx instanceof NextResponse) return ctx;
  try {
    return json({ course: ctx.kind === 'demo' ? demoCourse(ctx.user.uid) : await getCourse(ctx.projectId, ctx.user.uid) });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await projectCtx(params.id);
  if (ctx instanceof NextResponse) return ctx;
  const body = await readJson<{ level?: string; regenerate?: boolean }>(req);
  const level = (LEVELS.includes(body.level as Level) ? body.level : 'intermediate') as Level;
  try {
    if (ctx.kind === 'demo') {
      if (demoConcepts(ctx.user.uid).status !== 'ready') return json({ error: 'Map the concepts before building the course.' }, 409);
      return json({ course: demoStartCourse(ctx.user.uid) });
    }
    return json({ course: await withUserAI(() => startCourse(ctx.projectId, ctx.user.uid, level, Boolean(body.regenerate))) });
  } catch (err) {
    return fail(err);
  }
}
