import { NextResponse } from 'next/server';
import { userCtx, json, fail } from '@/lib/brain/route';
import { submitAttempt } from '@/lib/brain/service';
import { demoSubmit } from '@/lib/brain/demo';
import { getProfile } from '@/lib/data';

export async function POST(_req: Request, { params }: { params: { attemptId: string } }) {
  const user = await userCtx();
  if (user instanceof NextResponse) return user;
  try {
    if (user.demo) {
      const r = demoSubmit(user.uid, params.attemptId);
      return 'error' in r ? json({ error: r.error }, r.status) : json({ attempt: r });
    }
    const profile = await getProfile();
    const name = profile.full_name || user.name || profile.username || 'Projust learner';
    return json({ attempt: await submitAttempt(params.attemptId, user.uid, name) });
  } catch (err) {
    return fail(err);
  }
}
