import { NextResponse } from 'next/server';
import { projectCtx, json, fail, readJson } from '@/lib/brain/route';
import { setLessonDone } from '@/lib/brain/service';
import { demoCourse, demoLessonDone } from '@/lib/brain/demo';

export async function POST(req: Request, { params }: { params: { id: string; lessonId: string } }) {
  const ctx = await projectCtx(params.id);
  if (ctx instanceof NextResponse) return ctx;
  const { done } = await readJson<{ done?: boolean }>(req);
  const lessonId = decodeURIComponent(params.lessonId);
  try {
    if (ctx.kind === 'demo') {
      const course = demoCourse(ctx.user.uid);
      if (!course || !course.modules.some((m) => m.lessons.some((l) => l.id === lessonId))) return json({ error: 'Lesson not found' }, 404);
      return json({ completed_lesson_ids: demoLessonDone(ctx.user.uid, lessonId, done !== false) });
    }
    return json({ completed_lesson_ids: await setLessonDone(ctx.projectId, ctx.user.uid, lessonId, done !== false) });
  } catch (err) {
    return fail(err);
  }
}
