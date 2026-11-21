import { generateText } from 'ai';
import { z } from 'zod';
import { llmModel, llmFastModel, hasNonClaudeBackend } from '@/lib/ai/provider';
import { claudeJSON, isClaudeConfigured } from '@/lib/ai/claude';

/**
 * Ask the model for JSON matching a zod schema.
 *
 * Doesn't rely on provider-side structured outputs (Ollama, OpenRouter models and others
 * differ), so it works on every backend: the schema is described in the prompt, the reply is
 * extracted and validated, and on failure the validation error is fed back for up to
 * `retries` more tries.
 */
export async function generateJSON<T extends z.ZodTypeAny>(opts: {
  schema: T;
  system: string;
  prompt: string;
  fast?: boolean;
  retries?: number;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<z.infer<T>> {
  // Claude first (structured outputs, validated by the SDK); the other backends are the fallback.
  if (isClaudeConfigured) {
    try {
      return await claudeJSON(opts);
    } catch (err) {
      if (!hasNonClaudeBackend) throw err;
      console.warn('[ai] Claude failed, using fallback backend:', err instanceof Error ? err.message.slice(0, 200) : err);
    }
  }

  const jsonSchema = JSON.stringify(z.toJSONSchema(opts.schema));
  const system = `${opts.system}

Reply with ONE JSON value only — no prose, no markdown fences. It must validate against this JSON Schema:
${jsonSchema}`;

  let prompt = opts.prompt;
  let lastErr = '';
  const tries = (opts.retries ?? 2) + 1;

  for (let attempt = 0; attempt < tries; attempt++) {
    const { text } = await generateText({
      model: opts.fast ? llmFastModel : llmModel,
      system,
      prompt,
      temperature: opts.temperature ?? 0.3,
      // Reasoning models spend output tokens thinking before the answer; leave them room.
      maxOutputTokens: Math.min(32000, (opts.maxOutputTokens ?? 4096) * 2 + 2000),
      maxRetries: 2,
    });

    let raw = extractJson(text);
    raw = wrapBareArray(opts.schema, raw);
    if (raw === undefined) {
      lastErr = 'Reply did not contain valid JSON.';
    } else {
      const parsed = opts.schema.safeParse(raw);
      if (parsed.success) return parsed.data;
      lastErr = z.prettifyError(parsed.error).slice(0, 1500);
    }
    prompt = `${opts.prompt}

Your previous reply was rejected: ${lastErr}
Return corrected JSON only.`;
  }
  throw new Error(`Model returned invalid JSON after ${tries} tries: ${lastErr}`);
}

/** Models sometimes return `[...]` when asked for `{ items: [...] }`. Wrap it if the schema has one array field. */
function wrapBareArray(schema: z.ZodTypeAny, raw: unknown): unknown {
  if (!Array.isArray(raw) || !(schema instanceof z.ZodObject)) return raw;
  const keys = Object.keys(schema.shape);
  const arrayKeys = keys.filter((k) => schema.shape[k] instanceof z.ZodArray);
  return arrayKeys.length === 1 && keys.length === 1 ? { [arrayKeys[0]]: raw } : raw;
}

/** Pull the first JSON object/array out of a model reply (handles ```json fences and chatter). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text];
  for (const c of candidates) {
    if (!c) continue;
    const trimmed = c.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      // find the outermost balanced {...} or [...]
      const start = trimmed.search(/[[{]/);
      if (start === -1) continue;
      const open = trimmed[start];
      const close = open === '{' ? '}' : ']';
      let depth = 0;
      let inStr = false;
      let esc = false;
      for (let i = start; i < trimmed.length; i++) {
        const ch = trimmed[i];
        if (inStr) {
          if (esc) esc = false;
          else if (ch === '\\') esc = true;
          else if (ch === '"') inStr = false;
          continue;
        }
        if (ch === '"') inStr = true;
        else if (ch === open) depth++;
        else if (ch === close) {
          depth--;
          if (depth === 0) {
            try {
              return JSON.parse(trimmed.slice(start, i + 1));
            } catch {
              break;
            }
          }
        }
      }
    }
  }
  return undefined;
}

/** Run async work over items with a small concurrency limit (the GPU box handles one at a time). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}
