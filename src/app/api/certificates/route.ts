import { NextResponse } from 'next/server';
import { userCtx, json, fail } from '@/lib/brain/route';
import { listCertificates } from '@/lib/brain/service';
import { demoHasCert, sampleCertificate } from '@/lib/brain/demo';

export async function GET() {
  const user = await userCtx();
  if (user instanceof NextResponse) return user;
  try {
    if (user.demo) return json({ certificates: demoHasCert(user.uid) ? [sampleCertificate()] : [] });
    return json({ certificates: await listCertificates(user.uid) });
  } catch (err) {
    return fail(err);
  }
}
