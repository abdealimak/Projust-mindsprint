import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';

/**
 * Claude (Anthropic API) as the primary model for every AI step: repo summary at ingestion,
 * the tutor, concept maps, courses, quiz questions and answer grading.
 *
 * Turned on by ANTHROPIC_API_KEY. When it's missing, or a Claude call fails, callers fall back to
 * the OpenAI-compatible chain in ./provider.ts. Server-side only.
 */

export const CLAUDE_MODEL = process.env.AI_CLAUDE_MODEL || 'claude-opus-5-5';
/** Same model for quick jobs (routing, grading), just at lower effort. */
export const CLAUDE_FAST_MODEL = process.env.AI_CLAUDE_FAST_MODEL || CLAUDE_MODEL;

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const EFFORT_MAIN = (process.env.AI_CLAUDE_EFFORT as Effort) || 'medium';
const EFFORT_FAST = (process.env.AI_CLAUDE_FAST_EFFORT as Effort) || 'low';

export const isClaudeConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

/** On a safety decline, the API re-runs the request on Anthropic's recommended fallback model. */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

let client: Anthropic | null = null;
function claude(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      // Explicit, so a stray ANTHROPIC_BASE_URL in the shell can't reroute the app's traffic
      baseURL: process.env.AI_CLAUDE_BASE_URL || 'https://api.anthropic.com',
      maxRetries: 2,
    });
  }
  return client;
}

/** A Claude reply we can't use (declined, cut off, or failed validation). */
export class ClaudeUnusableReply extends Error {}

/**
 * Ask Claude for JSON that matches a zod schema, using structured outputs. The SDK drops schema
 * constraints the API can't enforce (min/max lengths, numeric bounds) and checks them on the
 * parsed result instead.
 */
export async function claudeJSON<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  prompt: string;
  fast?: boolean;
  maxOutputTokens?: number;
}): Promise<z.infer<T>> {
  const response = await claude().beta.messages.parse({
    model: opts.fast ? CLAUDE_FAST_MODEL : CLAUDE_MODEL,
    // Room for adaptive thinking plus the JSON itself; stays under the non-streaming timeout
    max_tokens: Math.min(16000, Math.max(8000, (opts.maxOutputTokens ?? 4096) * 2)),
    betas: [FALLBACK_BETA],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: {
      effort: opts.fast ? EFFORT_FAST : EFFORT_MAIN,
      format: betaZodOutputFormat(opts.schema),
    },
    system: opts.system,
    messages: [{ role: 'user', content: opts.prompt }],
  });

  if (response.stop_reason === 'refusal') {
    throw new ClaudeUnusableReply(`Claude declined (${response.stop_details?.category ?? 'no category'})`);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new ClaudeUnusableReply('Claude reply was cut off (max_tokens)');
  }
  if (response.parsed_output == null) {
    throw new ClaudeUnusableReply('Claude reply did not match the schema');
  }
  return response.parsed_output as z.infer<T>;
}

/**
 * Stream a tutor answer from Claude as plain text (same wire format as the AI SDK's
 * toTextStreamResponse, so the browser code doesn't change). `onFinish` gets the full text.
 */
export function claudeTextStreamResponse(opts: {
  system: string;
  prompt: string;
  headers?: Record<string, string>;
  onFinish?: (text: string) => Promise<void> | void;
}): Response {
  const stream = claude().beta.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 64000,
    betas: [FALLBACK_BETA],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort: EFFORT_MAIN },
    system: opts.system,
    messages: [{ role: 'user', content: opts.prompt }],
  });

  const encoder = new TextEncoder();
  let full = '';
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') {
          const note = '\n\n_The tutor could not answer this one. Try rephrasing the question._';
          full += note;
          controller.enqueue(encoder.encode(note));
        }
        await opts.onFinish?.(full);
        controller.close();
      } catch (err) {
        console.error('[ai] Claude stream failed:', err instanceof Error ? err.message : err);
        controller.error(err);
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...opts.headers },
  });
}
