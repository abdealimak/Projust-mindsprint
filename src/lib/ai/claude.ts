import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { recordUsage } from './usage';
import { activeAI } from './user-settings';

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

/** True when the server itself has a Claude key (ANTHROPIC_API_KEY). */
export const isClaudeConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

/** On a safety decline, the API re-runs the request on Anthropic's recommended fallback model. */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
/** Server-side fallbacks exist for these models (not Haiku). */
const supportsFallback = (model: string) => /^claude-(fable|mythos|opus-5|sonnet-5-5)/.test(model);

const BASE_URL = process.env.AI_CLAUDE_BASE_URL || 'https://api.anthropic.com';
let serverClient: Anthropic | null = null;
const userClients = new Map<string, Anthropic>();

function makeClient(apiKey: string) {
  // Explicit baseURL, so a stray ANTHROPIC_BASE_URL in the shell can't reroute the app's traffic
  return new Anthropic({ apiKey, baseURL: BASE_URL, maxRetries: 2 });
}

/**
 * Which Claude account and model this request uses: the signed-in user's own key from
 * Settings → AI, else the server's key (if this user is allowed to use it), else none.
 */
function claudeTarget(): { client: Anthropic; model: string; fastModel: string } | null {
  const ctx = activeAI();
  if (ctx.user) {
    if (ctx.user.provider !== 'anthropic') return null;
    let c = userClients.get(ctx.user.apiKey);
    if (!c) {
      if (userClients.size > 200) userClients.clear();
      c = makeClient(ctx.user.apiKey);
      userClients.set(ctx.user.apiKey, c);
    }
    return { client: c, model: ctx.user.model, fastModel: ctx.user.model };
  }
  if (!ctx.allowServer || !isClaudeConfigured) return null;
  serverClient ??= makeClient(process.env.ANTHROPIC_API_KEY as string);
  return { client: serverClient, model: CLAUDE_MODEL, fastModel: CLAUDE_FAST_MODEL };
}

/** Whether this request should go to Claude. */
export const claudeAvailable = () => claudeTarget() !== null;

function target() {
  const t = claudeTarget();
  if (!t) throw new Error('No Claude key is set up. Add one in Settings → AI.');
  return t;
}

const fallbackParams = (model: string) =>
  supportsFallback(model) ? { betas: [FALLBACK_BETA], fallbacks: 'default' as const } : {};

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
  const t = target();
  const model = opts.fast ? t.fastModel : t.model;
  const response = await t.client.beta.messages.parse({
    model,
    // Room for adaptive thinking plus the JSON itself; stays under the non-streaming timeout
    max_tokens: Math.min(16000, Math.max(8000, (opts.maxOutputTokens ?? 4096) * 2)),
    ...fallbackParams(model),
    thinking: { type: 'adaptive' },
    output_config: {
      effort: opts.fast ? EFFORT_FAST : EFFORT_MAIN,
      format: betaZodOutputFormat(opts.schema),
    },
    // Cache the system prompt: it repeats across every chunk, lesson and question of a step
    system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: opts.prompt }],
  });
  recordUsage(response.model, response.usage);

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
  const t = target();
  const stream = t.client.beta.messages.stream({
    model: t.model,
    max_tokens: 64000,
    ...fallbackParams(t.model),
    thinking: { type: 'adaptive' },
    output_config: { effort: EFFORT_MAIN },
    system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
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
        recordUsage(final.model, final.usage, 'tutor');
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
