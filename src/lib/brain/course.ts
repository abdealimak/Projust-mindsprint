import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateJSON } from './llm';
import { isBatchMode } from '@/lib/ai/provider';
import { loadSourceFiles } from './concepts';
import { numbered, type SourceFile } from './files';
import type { CodeRef, CourseModule, Lesson } from '@/types/learning';

export type Level = 'beginner' | 'intermediate' | 'advanced';

interface ConceptRow {
  key: string;
  name: string;
  category: string;
  description: string;
  difficulty: string;
  files: CodeRef[];
  depends_on: string[];
  position: number;
}

const PlanSchema = z.object({
  title: z.string().min(4).max(90),
  modules: z
    .array(z.object({ title: z.string().min(3).max(80), concept_keys: z.array(z.string()).min(1).max(5) }))
    .min(2)
    .max(6),
});

const LessonSchema = z.object({
  title: z.string().min(3).max(90),
  minutes: z.number().int().min(3).max(25),
  body_md: z.string().min(300).max(9000),
  check_questions: z.array(z.string().min(8).max(240)).min(2).max(4),
});

const ModuleLessonsSchema = z.object({
  lessons: z
    .array(
      LessonSchema.extend({ concept_key: z.string() })
    )
    .min(1)
    .max(6),
});

const PLAN_SYSTEM = `You design a short course that teaches a student the code they themselves wrote (often with AI help).
Group the given concepts into 3-5 modules in learning order (dependencies first). Every concept key appears in exactly one module.
Module titles are plain and specific ("How checkout stays idempotent"), not generic ("Module 1").`;

const levelNote: Record<Level, string> = {
  beginner: 'The student is a beginner: define terms, go slowly, small steps.',
  intermediate: 'The student is intermediate: skip basics, focus on how and why.',
  advanced: 'The student is advanced: focus on trade-offs, failure modes and alternatives.',
};

const LESSON_SYSTEM = `You write one lesson that teaches a student THEIR OWN code. Markdown body, 350-900 words.
Structure (use these as ## headings): "What it does", "Read the code", "Why it's written this way", "What breaks if you change it", "Try it".
- Quote short pieces of the real code from the excerpt in fenced blocks with the right language, and refer to file paths and line numbers like \`src/x.ts:12-20\`.
- Explain decisions and trade-offs; name one realistic bug or failure this code prevents or risks.
- "Try it" = one small hands-on change the student can make and what they should observe.
- Never invent files or functions that aren't in the excerpt. Plain, friendly, direct sentences.
check_questions: 2-4 short self-check questions about this code (not trivia).`;

function excerptFor(c: ConceptRow, files: Map<string, SourceFile>, budget = 9000): string {
  let out = '';
  for (const r of c.files) {
    const f = files.get(r.path);
    if (!f) continue;
    const s = Math.max(1, r.startLine - 4);
    const e = Math.min(f.line_count, r.endLine + 4);
    const block = `### ${r.path} (lines ${s}-${e})\n${numbered(f, s, e)}\n\n`;
    if (out.length + block.length > budget) break;
    out += block;
  }
  return out || '(no excerpt available)';
}

async function loadConcepts(projectId: string): Promise<ConceptRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('concepts')
    .select('key, name, category, description, difficulty, files, depends_on, position')
    .eq('project_id', projectId)
    .order('position');
  return (data || []) as ConceptRow[];
}

export async function generateCourse(courseId: string, projectId: string, userId: string, level: Level): Promise<void> {
  const supabase = createClient();
  const save = (patch: Record<string, unknown>) =>
    supabase.from('courses').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', courseId).eq('user_id', userId);

  try {
    const [{ data: project }, concepts, files] = await Promise.all([
      supabase.from('projects').select('repo_full_name').eq('id', projectId).single(),
      loadConcepts(projectId),
      loadSourceFiles(projectId),
    ]);
    if (concepts.length === 0) throw new Error('Map the concepts first.');
    const fileMap = new Map(files.map((f) => [f.path, f]));

    await save({ status_detail: 'Planning modules', progress: 0.03 });
    const plan = await generateJSON({
      schema: PlanSchema,
      system: PLAN_SYSTEM,
      prompt: `Repository: ${project?.repo_full_name}\n${levelNote[level]}\n\nCONCEPTS (in dependency order):\n${concepts
        .map((c) => `- ${c.key} [${c.difficulty}] ${c.name}: ${c.description} (needs: ${c.depends_on.join(', ') || 'none'})`)
        .join('\n')}`,
      maxOutputTokens: 1500,
    });

    // Every concept exactly once, unknown keys dropped, leftovers appended to the last module.
    const byKey = new Map(concepts.map((c) => [c.key, c]));
    const seen = new Set<string>();
    const modulesPlan = plan.modules
      .map((m) => ({ title: m.title, keys: m.concept_keys.filter((k) => byKey.has(k) && !seen.has(k) && seen.add(k)) }))
      .filter((m) => m.keys.length);
    const leftovers = concepts.map((c) => c.key).filter((k) => !seen.has(k));
    if (modulesPlan.length === 0) modulesPlan.push({ title: 'Your code, concept by concept', keys: [] });
    modulesPlan[modulesPlan.length - 1].keys.push(...leftovers);

    const totalLessons = modulesPlan.reduce((t, m) => t + m.keys.length, 0);
    const modules: CourseModule[] = modulesPlan.map((m, i) => ({ id: `m${i + 1}`, title: m.title, concept_keys: m.keys, lessons: [] }));
    await save({ title: plan.title, modules, status_detail: `Writing lesson 1 of ${totalLessons}`, progress: 0.08 });

    let written = 0;
    const fallbackLesson = (mod: CourseModule, c: ConceptRow): Lesson => ({
      id: `${mod.id}-${c.key}`,
      title: c.name,
      minutes: 5,
      body_md: `## What it does\n\n${c.description}\n\n## Read the code\n\n${c.files.map((r) => `- \`${r.path}:${r.startLine}-${r.endLine}\``).join('\n') || 'No code references were found.'}\n\n_This lesson couldn't be fully written. Regenerate the course to try again._`,
      code_refs: c.files,
      check_questions: [`Where in your code does "${c.name}" happen?`, `What would break if it were removed?`],
    });
    const progress = async () =>
      save({
        modules,
        progress: 0.08 + 0.92 * (written / totalLessons),
        status_detail: written < totalLessons ? `Writing lesson ${written + 1} of ${totalLessons}` : 'Done',
      });

    for (const mod of modules) {
      if (isBatchMode) {
        // One call per module: all its lessons at once (fewer requests on free tiers).
        const cs = mod.concept_keys.map((k) => byKey.get(k)!);
        let got: z.infer<typeof ModuleLessonsSchema>['lessons'] = [];
        try {
          const res = await generateJSON({
            schema: ModuleLessonsSchema,
            system: `${LESSON_SYSTEM}\nWrite one lesson per concept listed, in the same order, and set concept_key to that concept's key.`,
            prompt: `Repository: ${project?.repo_full_name}\nModule: ${mod.title}\n${levelNote[level]}\n\n${cs
              .map((c) => `=== CONCEPT key=${c.key}\n${c.name} (${c.category}, ${c.difficulty})\n${c.description}\n\nCODE EXCERPT:\n${excerptFor(c, fileMap, 7000)}`)
              .join('\n\n')}`,
            maxOutputTokens: Math.min(16000, 3200 * cs.length),
            temperature: 0.4,
          });
          got = res.lessons;
        } catch (err) {
          console.warn('[brain] module lessons failed:', mod.title, err instanceof Error ? err.message : err);
        }
        for (const c of cs) {
          const l = got.find((x) => x.concept_key === c.key);
          mod.lessons.push(
            l
              ? { id: `${mod.id}-${c.key}`, title: l.title, minutes: l.minutes, body_md: l.body_md, code_refs: c.files, check_questions: l.check_questions }
              : fallbackLesson(mod, c)
          );
          written++;
        }
        await progress();
        continue;
      }

      for (const key of mod.concept_keys) {
        const c = byKey.get(key)!;
        let lesson: Lesson;
        try {
          const l = await generateJSON({
            schema: LessonSchema,
            system: LESSON_SYSTEM,
            prompt: `Repository: ${project?.repo_full_name}\nModule: ${mod.title}\n${levelNote[level]}\nConcept: ${c.name} (${c.category}, ${c.difficulty})\n${c.description}\n\nCODE EXCERPT:\n${excerptFor(c, fileMap)}`,
            maxOutputTokens: 3000,
            temperature: 0.4,
          });
          lesson = { id: `${mod.id}-${key}`, title: l.title, minutes: l.minutes, body_md: l.body_md, code_refs: c.files, check_questions: l.check_questions };
        } catch (err) {
          console.warn('[brain] lesson failed:', key, err instanceof Error ? err.message : err);
          lesson = fallbackLesson(mod, c);
        }
        mod.lessons.push(lesson);
        written++;
        await progress();
      }
    }

    await save({ status: 'ready', status_detail: `${totalLessons} lessons`, progress: 1, modules });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Course generation failed';
    console.error('[brain] course failed:', err);
    await save({ status: 'failed', status_detail: msg });
  }
}
