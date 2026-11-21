import { NextResponse } from 'next/server';
import { userCtx, json, fail } from '@/lib/brain/route';
import { getAttempt } from '@/lib/brain/service';
import { demoAttempt } from '@/lib/brain/demo';

export async function GET(_req: Request, { params }: { params: { attemptId: string } }) {
  const user = await userCtx();
  if (user instanceof NextResponse) return user;
  try {
    if (user.demo) {
      const a = demoAttempt(user.uid, params.attemptId);
      return a ? json({ attempt: a }) : json({ error: 'Attempt not found' }, 404);
    }
    return json({ attempt: await getAttempt(params.attemptId, user.uid) });
  } catch (err) {
    return fail(err);
  }
}
