import { withUsage } from '@/lib/ai/usage';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateJSON, mapLimit } from './llm';
import { isBatchMode } from '@/lib/ai/provider';
import { chunkFiles, cleanRefs, slugify, type SourceFile } from './files';
import type { CodeRef } from '@/types/learning';

const RefSchema = z.object({ path: z.string(), startLine: z.number(), endLine: z.number() });

const ChunkNotesSchema = z.object({
  concepts: z
    .array(
      z.object({
        name: z.string().min(2).max(90),
        category: z.string().min(2).max(40),
        description: z.string().min(10).max(400),
        refs: z.array(RefSchema).max(4),
      })
    )
    .max(14),
});

const FinalSchema = z.object({
  concepts: z
    .array(
      z.object({
        key: z.string().min(2).max(48),
        name: z.string().min(2).max(90),
        category: z.string().min(2).max(40),
        description: z.string().min(20).max(600),
        difficulty: z.enum(['intro', 'core', 'advanced']),
        refs: z.array(RefSchema).max(6),
        depends_on: z.array(z.string()).max(6),
      })
    )
    .min(4)
    .max(18),
});

const MAP_SYSTEM = `You read part of a student's own code repository and list the technical concepts THIS code actually uses.
Be specific to the code: "Idempotency keys on POST /checkout" not "HTTP". Skip trivia (imports, formatting, generic syntax).
Each concept cites the exact line ranges where it lives, using the numbers shown before "|".
Categories are short nouns like Auth, Data, API, Concurrency, Security, Testing, Architecture, UI, Infra, Algorithms.`;

const REDUCE_SYSTEM = `You merge concept notes from a code repository into ONE learning map for the student who wrote it.
Rules:
- 8 to 14 concepts, each specific to this repository and worth teaching. Merge duplicates.
- key: short kebab-case slug, unique.
- depends_on: keys of concepts that must be understood first. No cycles. Foundations have none.
- difficulty: intro (needed to read the code at all), core (how the main features work), advanced (trade-offs, failure modes, scaling, security).
- Keep the best file refs (exact paths and line ranges from the notes).
- description: 1-3 plain sentences saying what it is and where it shows up in this code.`;

export async function loadSourceFiles(projectId: string, maxChars = 160_000): Promise<SourceFile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('project_files')
    .select('path, language, content, priority, line_count')
    .eq('project_id', projectId)
    .order('priority', { ascending: false })
    .limit(120);
  if (error) throw new Error(`Could not read project files: ${error.message}`);
  const out: SourceFile[] = [];
  let total = 0;
  for (const f of data || []) {
    if (total + f.content.length > maxChars && out.length >= 8) break;
    out.push({ ...f, line_count: f.line_count || f.content.split('\n').length });
    total += f.content.length;
  }
  return out;
}

/** Drop dependency edges that point nowhere or would form a cycle (keeps the earliest order). */
export function acyclic(items: { key: string; depends_on: string[] }[]): Map<string, string[]> {
  const keys = new Set(items.map((i) => i.key));
  const deps = new Map(items.map((i) => [i.key, Array.from(new Set(i.depends_on.filter((d) => keys.has(d) && d !== i.key)))]));
  const state = new Map<string, 0 | 1 | 2>(); // 0 new, 1 visiting, 2 done
  const visit = (k: string) => {
    state.set(k, 1);
    const kept: string[] = [];
    for (const d of deps.get(k) || []) {
      const s = state.get(d) || 0;
      if (s === 1) continue; // back edge → cycle, drop it
      if (s === 0) visit(d);
      kept.push(d);
    }
    deps.set(k, kept);
    state.set(k, 2);
  };
  for (const i of items) if (!state.get(i.key)) visit(i.key);
  return deps;
}

/** Topological order (dependencies first), stable by original position. */
export function topoOrder(items: { key: string }[], deps: Map<string, string[]>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const visit = (k: string) => {
    if (seen.has(k)) return;
    seen.add(k);
    for (const d of deps.get(k) || []) visit(d);
    out.push(k);
  };
  items.forEach((i) => visit(i.key));
  return out;
}

async function generateConceptsRun(projectId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const setStatus = (status: string, detail: string, progress: number) =>
    supabase
      .from('projects')
      .update({ concepts_status: status, concepts_detail: detail, concepts_progress: progress, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', userId);

  try {
    await setStatus('generating', 'Reading your code', 0.02);
    const { data: project } = await supabase.from('projects').select('repo_full_name, summary').eq('id', projectId).single();
    const files = await loadSourceFiles(projectId);
    if (files.length === 0) throw new Error('This project has no indexed files yet. Re-sync it first.');
    const fileMap = new Map(files.map((f) => [f.path, f]));

    // Map: chunk-sized notes. ~12k chars ≈ 3k tokens keeps us inside an 8k context on the GPU box.
    // Batch mode (big-context cloud models, free-tier quotas): a few large chunks instead.
    const chunks = isBatchMode ? chunkFiles(files, 60_000).slice(0, 3) : chunkFiles(files, 12_000).slice(0, 14);
    let done = 0;
    const notes = await mapLimit(chunks, isBatchMode ? 1 : 2, async (chunk) => {
      try {
        const res = await generateJSON({
          schema: ChunkNotesSchema,
          system: MAP_SYSTEM,
          prompt: `Repository: ${project?.repo_full_name}\n\nCODE:\n${chunk}`,
          fast: true,
          maxOutputTokens: isBatchMode ? 3500 : 1500,
        });
        return res.concepts;
      } catch (err) {
        console.warn('[brain] concept notes failed for a chunk:', err instanceof Error ? err.message : err);
        return [];
      } finally {
        done++;
        await setStatus('generating', `Mapping concepts in part ${done} of ${chunks.length}`, 0.05 + 0.65 * (done / chunks.length));
      }
    });

    const flat = notes.flat();
    if (flat.length === 0) throw new Error('The AI could not read concepts from this code. Try again in a minute.');

    await setStatus('generating', 'Connecting concepts into a map', 0.75);
    const summary = project?.summary
      ? JSON.stringify({ oneLiner: project.summary.oneLiner, architecture: project.summary.architecture, techStack: project.summary.techStack })
      : 'none';
    const merged = await generateJSON({
      schema: FinalSchema,
      system: REDUCE_SYSTEM,
      prompt: `Repository: ${project?.repo_full_name}\nSummary: ${summary}\n\nCONCEPT NOTES:\n${JSON.stringify(flat).slice(0, 24_000)}`,
      maxOutputTokens: 4000,
    });

    // Clean: unique keys, real refs, acyclic deps, dependency order.
    const used = new Set<string>();
    const items = merged.concepts.map((c) => {
      let key = slugify(c.key || c.name);
      while (used.has(key)) key = `${key}-2`;
      used.add(key);
      return { ...c, key, refs: cleanRefs(c.refs as CodeRef[], fileMap) };
    });
    const keyMap = new Map(merged.concepts.map((c, i) => [slugify(c.key || c.name), items[i].key]));
    items.forEach((i) => (i.depends_on = i.depends_on.map((d) => keyMap.get(slugify(d)) || slugify(d))));
    const deps = acyclic(items);
    const order = topoOrder(items, deps);

    await supabase.from('concepts').delete().eq('project_id', projectId);
    const rows = order.map((key, position) => {
      const c = items.find((i) => i.key === key)!;
      return {
        project_id: projectId,
        user_id: userId,
        key,
        name: c.name,
        category: c.category,
        description: c.description,
        difficulty: c.difficulty,
        files: c.refs,
        depends_on: deps.get(key) || [],
        position,
      };
    });
    const { error } = await supabase.from('concepts').insert(rows);
    if (error) throw new Error(`Could not save concepts: ${error.message}`);

    await setStatus('ready', `${rows.length} concepts mapped`, 1);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Concept mapping failed';
    console.error('[brain] concepts failed:', err);
    await setStatus('failed', msg, 0);
  }
}

/** generateConcepts with its token usage saved per project. */
export function generateConcepts(projectId: string, userId: string): Promise<void> {
  return withUsage({ projectId, step: 'concepts' }, () => generateConceptsRun(projectId, userId));
}
