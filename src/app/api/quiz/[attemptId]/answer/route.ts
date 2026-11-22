import { NextResponse } from 'next/server';
import { withUserAI } from '@/lib/ai/user-settings';
import { userCtx, json, fail, readJson } from '@/lib/brain/route';
import { answerQuestion } from '@/lib/brain/service';
import { demoAnswer } from '@/lib/brain/demo';

/** AI jobs started here can run for minutes (serverless hosts stop functions at this limit). */
export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: { attemptId: string } }) {
  const user = await userCtx();
  if (user instanceof NextResponse) return user;
  const { questionId, answer } = await readJson<{ questionId?: string; answer?: unknown }>(req);
  if (!questionId || typeof answer !== 'string') return json({ error: 'questionId and answer are required' }, 400);
  if (answer.length > 6000) return json({ error: 'Answer is too long (max 6000 characters).' }, 400);
  try {
    if (user.demo) {
      const r = demoAnswer(user.uid, params.attemptId, questionId, answer);
      return 'error' in r ? json({ error: r.error }, r.status) : json({ graded: r });
    }
    return json({ graded: await withUserAI(() => answerQuestion(params.attemptId, user.uid, questionId, answer)) });
  } catch (err) {
    return fail(err);
  }
}
