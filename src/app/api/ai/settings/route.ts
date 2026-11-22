import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/user';
import { isLlmConfigured, serverAILabel } from '@/lib/ai/provider';
import {
  clearUserAI,
  mayUseServerAI,
  readUserAI,
  toPublic,
  validateSettings,
  writeUserAI,
} from '@/lib/ai/user-settings';

/**
 * Settings → AI. The API key is accepted on POST and never returned: GET only gives the
 * provider, model and a hint like "sk-ant-…9f3a".
 */
const noStore = { 'Cache-Control': 'no-store' };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401, headers: noStore });
  const saved = user.demo ? null : readUserAI(user.uid);
  const allowed = !user.demo && mayUseServerAI(user.email);
  return NextResponse.json(
    {
      settings: saved ? toPublic(saved) : null,
      server: { available: allowed && isLlmConfigured, label: allowed ? serverAILabel() : null },
      demo: user.demo,
    },
    { headers: noStore }
  );
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401, headers: noStore });
  if (user.demo) {
    return NextResponse.json({ error: 'Demo mode uses sample data. Sign in with GitHub or Google to use your own key.' }, { status: 403, headers: noStore });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body → validation error below
  }
  // Changing only the model or provider endpoint keeps the stored key
  const current = readUserAI(user.uid);
  const apiKey = typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey : current?.provider === body.provider ? current?.apiKey : undefined;
  const v = validateSettings({ ...body, apiKey });
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400, headers: noStore });

  const saved = writeUserAI(user.uid, v.value, new URL(req.url).protocol === 'https:');
  return NextResponse.json({ settings: toPublic(saved) }, { headers: noStore });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401, headers: noStore });
  clearUserAI();
  return NextResponse.json({ ok: true }, { headers: noStore });
}
