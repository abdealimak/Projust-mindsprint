import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { generateText } from 'ai';
import { getCurrentUser } from '@/lib/auth/user';
import { userChatModel } from '@/lib/ai/provider';
import { readUserAI, validateSettings, type UserAI } from '@/lib/ai/user-settings';

/**
 * Check a key + model before (or after) saving. Claude: the free models endpoint confirms the key
 * and the model id without using tokens. Other providers: one tiny completion (a few tokens).
 * Provider error messages are shortened and never include the key.
 */
const noStore = { 'Cache-Control': 'no-store' };

function short(err: unknown): string {
  const status = (err as { status?: number; statusCode?: number })?.status ?? (err as { statusCode?: number })?.statusCode;
  if (status === 401 || status === 403) return 'The provider rejected this API key.';
  if (status === 404) return 'The provider does not know this model id (or the endpoint URL is wrong).';
  if (status === 429) return 'The key works but is rate-limited or out of credit right now.';
  const msg = err instanceof Error ? err.message : String(err);
  return (status ? `Provider error ${status}: ` : '') + msg.replace(/(sk-[\w-]{6})[\w-]+/g, '$1…').slice(0, 200);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401, headers: noStore });
  if (user.demo) return NextResponse.json({ error: 'Not available in demo mode.' }, { status: 403, headers: noStore });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // test the saved settings
  }
  const current = readUserAI(user.uid);
  let target: Omit<UserAI, 'savedAt'> | null = null;
  if (body.provider) {
    const apiKey = typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey : current?.provider === body.provider ? current?.apiKey : undefined;
    const v = validateSettings({ ...body, apiKey });
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400, headers: noStore });
    target = v.value;
  } else if (current) {
    target = current;
  }
  if (!target) return NextResponse.json({ ok: false, error: 'Nothing to test yet. Enter a provider, model and key.' }, { status: 400, headers: noStore });

  const started = Date.now();
  try {
    if (target.provider === 'anthropic') {
      const client = new Anthropic({ apiKey: target.apiKey, baseURL: process.env.AI_CLAUDE_BASE_URL || 'https://api.anthropic.com', maxRetries: 0, timeout: 15000 });
      const m = await client.models.retrieve(target.model);
      return NextResponse.json({ ok: true, detail: `Key works. ${m.display_name || m.id} is available.`, ms: Date.now() - started }, { headers: noStore });
    }
    const { text } = await generateText({
      model: userChatModel({ ...target, savedAt: '' }),
      prompt: 'Reply with the single word: ok',
      maxOutputTokens: 8,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(20000),
    });
    return NextResponse.json(
      { ok: true, detail: `Key works. The model replied${text.trim() ? ` "${text.trim().slice(0, 20)}"` : ''}.`, ms: Date.now() - started },
      { headers: noStore }
    );
  } catch (err) {
    return NextResponse.json({ ok: false, error: short(err) }, { status: 200, headers: noStore });
  }
}
