// Claude adapter against a local mock of the Anthropic API: request shape, parsing, refusal and errors.

import http from 'node:http';
import { z } from 'zod';

let last: any = null;
let mode: 'ok' | 'refusal' | 'error' | 'stream' = 'ok';
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    last = { url: req.url, headers: req.headers, body: JSON.parse(body) };
    if (mode === 'stream') {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const ev = (type: string, data: object) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
      ev('message_start', { message: { id: 'msg_2', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 5, output_tokens: 0 } } });
      ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
      ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'See ' } });
      ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'checkout.ts:12' } });
      ev('content_block_stop', { index: 0 });
      ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 4 } });
      ev('message_stop', {});
      res.end();
      return;
    }
    if (mode === 'error') { res.writeHead(401, { 'content-type': 'application/json' }); res.end(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'bad key' } })); return; }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
      content: mode === 'refusal' ? [] : [{ type: 'text', text: JSON.stringify({ title: 'Idempotency', level: 3, tags: ['api'] }) }],
      stop_reason: mode === 'refusal' ? 'refusal' : 'end_turn', stop_sequence: null,
      stop_details: mode === 'refusal' ? { type: 'refusal', category: null, explanation: null } : null,
      usage: { input_tokens: 10, output_tokens: 10 },
    }));
  });
});
await new Promise<void>((r) => server.listen(0, r));
const port = (server.address() as any).port;
process.env.ANTHROPIC_API_KEY = 'sk-test';
process.env.AI_CLAUDE_BASE_URL = `http://127.0.0.1:${port}`;

const { claudeJSON } = await import('@/lib/ai/claude');
const schema = z.object({ title: z.string().min(2).max(80), level: z.number().int().min(1).max(5), tags: z.array(z.string()) });

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); };

const out = await claudeJSON({ schema, system: 'sys', prompt: 'hi', fast: true });
check('parses structured output', out.title === 'Idempotency' && out.level === 3);
const b = last.body;
check('model', b.model === 'claude-opus-5-5', b.model);
check('fast uses low effort', b.output_config?.effort === 'low');
check('json_schema format sent', b.output_config?.format?.type === 'json_schema');
const props = b.output_config.format.schema.properties;
check('unsupported constraints moved out of the schema', !('maxLength' in props.title) && !('maximum' in props.level));
check('fallbacks default', b.fallbacks === 'default');
check('beta header', String(last.headers['anthropic-beta']).includes('server-side-fallback-2026-07-01'), String(last.headers['anthropic-beta']));
check('adaptive thinking', b.thinking?.type === 'adaptive');
check('no temperature', !('temperature' in b));
check('hits /v1/messages', String(last.url).startsWith('/v1/messages'), last.url);

await claudeJSON({ schema, system: 's', prompt: 'p' });
check('main uses medium effort', last.body.output_config.effort === 'medium');

mode = 'refusal';
try { await claudeJSON({ schema, system: 's', prompt: 'p' }); check('refusal throws', false); } catch (e: any) { check('refusal throws', /declined/.test(e.message)); }
mode = 'error';
try { await claudeJSON({ schema, system: 's', prompt: 'p' }); check('auth error throws', false); } catch (e: any) { check('auth error throws', e.status === 401); }

mode = 'stream';
const { claudeTextStreamResponse } = await import('@/lib/ai/claude');
let finished = '';
const resp = claudeTextStreamResponse({ system: 's', prompt: 'p', headers: { 'x-thread-id': 't1' }, onFinish: (t) => { finished = t; } });
const streamed = await resp.text();
check('tutor streams plain text', streamed === 'See checkout.ts:12', JSON.stringify(streamed));
check('tutor keeps thread header', resp.headers.get('x-thread-id') === 't1');
check('tutor onFinish gets full text', finished === 'See checkout.ts:12');
check('tutor request is streamed', last.body.stream === true && last.body.fallbacks === 'default');

server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
