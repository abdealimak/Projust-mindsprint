import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOwnedProject } from '@/lib/auth/user';

type Row = { step: string; input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_write_tokens: number };

/** Token totals for a project, per step (summary, concepts, course, quiz, grade, tutor). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const owned = await getOwnedProject(params.id, 'id');
  if (!owned.project) {
    return NextResponse.json({ error: owned.status === 401 ? 'Sign in required' : 'Project not found' }, { status: owned.status });
  }
  const { data, error } = await createClient()
    .from('ai_usage')
    .select('step, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens')
    .eq('project_id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const steps: Record<string, Omit<Row, 'step'> & { calls: number }> = {};
  const total = { calls: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 };
  for (const r of (data || []) as Row[]) {
    const s = (steps[r.step] ||= { calls: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 });
    for (const t of [s, total]) {
      t.calls++;
      t.input_tokens += r.input_tokens;
      t.output_tokens += r.output_tokens;
      t.cache_read_tokens += r.cache_read_tokens;
      t.cache_write_tokens += r.cache_write_tokens;
    }
  }
  return NextResponse.json({ total, steps });
}
