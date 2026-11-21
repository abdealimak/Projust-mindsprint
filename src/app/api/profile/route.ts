import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/user';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/data';

const DEMO_MESSAGE = "Demo profiles can't be saved. Sign in with GitHub or Google to save your profile.";
const SCHEMA_MESSAGE =
  'Your database is missing the latest profile schema. Apply supabase/migrations/003_firebase_and_learning.sql, then try again.';

const LINKEDIN_RE = /^https:\/\/(www\.)?linkedin\.com(\/[^\s]*)?$/i;

/** Optional text field: trimmed, empty string means "clear it". */
const text = (max: number, label: string) =>
  z
    .string({ error: `${label} must be text.` })
    .trim()
    .max(max, { error: `${label} can be at most ${max} characters.` });

const PatchSchema = z
  .object({
    username: z
      .string({ error: 'Username must be text.' })
      .trim()
      .toLowerCase()
      .min(3, { error: 'Username needs at least 3 characters.' })
      .max(30, { error: 'Username can be at most 30 characters.' })
      .regex(/^[a-z0-9_-]+$/, { error: 'Use only lowercase letters, numbers, - and _ in your username.' }),
    full_name: text(80, 'Full name'),
    headline: text(120, 'Headline'),
    bio: text(600, 'Bio'),
    linkedin_url: text(300, 'LinkedIn URL').refine((v) => v === '' || LINKEDIN_RE.test(v), {
      error: 'Use a full LinkedIn link that starts with https://linkedin.com or https://www.linkedin.com.',
    }),
    public_profile: z.boolean({ error: 'Public profile must be on or off.' }),
  })
  .partial()
  .strict();

type DbError = { code?: string; message?: string } | null;

function isSchemaError(err: DbError): boolean {
  if (!err) return false;
  // 42703 undefined column, 22P02 invalid uuid text, 23503 old auth.users FK, PGRST204 column not in cache
  if (['42703', '22P02', '23503', 'PGRST204', '42P01'].includes(err.code ?? '')) return true;
  return /column|uuid|schema cache/i.test(err.message ?? '');
}

function dbFailure(err: DbError) {
  if (isSchemaError(err)) {
    return NextResponse.json({ error: SCHEMA_MESSAGE, code: 'schema_out_of_date' }, { status: 500 });
  }
  console.error('[api/profile] database error', err);
  return NextResponse.json(
    { error: "Couldn't save your profile. Check your connection and try again." },
    { status: 500 }
  );
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to view your profile.' }, { status: 401 });

  const profile = await getProfile();
  return NextResponse.json({
    profile: { public_profile: true, ...profile },
    demo: user.demo,
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to save your profile.' }, { status: 401 });
  if (user.demo) return NextResponse.json({ error: DEMO_MESSAGE, code: 'demo' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send the profile as JSON.' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '_');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json(
      { error: 'Some fields need fixing before you can save.', fieldErrors },
      { status: 400 }
    );
  }
  const patch = parsed.data;

  try {
    const supabase = createClient();

    const { data: existing, error: readError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.uid)
      .maybeSingle();
    if (readError) return dbFailure(readError);

    if (patch.username) {
      const { data: taken, error: takenError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', patch.username)
        .neq('id', user.uid)
        .limit(1);
      if (takenError) return dbFailure(takenError);
      if (taken && taken.length > 0) {
        return NextResponse.json(
          {
            error: 'Some fields need fixing before you can save.',
            fieldErrors: { username: 'That username is taken. Try another one.' },
          },
          { status: 400 }
        );
      }
    }

    const base = existing ?? (await getProfile());
    const nullable = (v: string | undefined, prev: unknown) =>
      v === undefined ? (prev as string | null) ?? null : v === '' ? null : v;

    const row = {
      id: user.uid,
      username: patch.username ?? base.username ?? null,
      full_name: nullable(patch.full_name, base.full_name),
      headline: nullable(patch.headline, base.headline),
      bio: nullable(patch.bio, base.bio),
      linkedin_url: nullable(patch.linkedin_url, base.linkedin_url),
      public_profile:
        patch.public_profile ?? (existing as { public_profile?: boolean } | null)?.public_profile ?? true,
      email: user.email ?? base.email ?? null,
      avatar_url: base.avatar_url ?? user.picture ?? null,
      github_username: base.github_username ?? null,
      github_connected: base.github_connected ?? false,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: writeError } = await supabase
      .from('profiles')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();

    if (writeError) {
      if (writeError.code === '23505') {
        return NextResponse.json(
          {
            error: 'Some fields need fixing before you can save.',
            fieldErrors: { username: 'That username is taken. Try another one.' },
          },
          { status: 400 }
        );
      }
      return dbFailure(writeError);
    }

    return NextResponse.json({ profile: { public_profile: true, ...saved }, demo: false });
  } catch (err) {
    console.error('[api/profile] unexpected error', err);
    return NextResponse.json(
      { error: "Couldn't reach the profile database. Check the Supabase settings in .env.local, then try again." },
      { status: 500 }
    );
  }
}
