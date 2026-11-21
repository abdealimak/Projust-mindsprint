/**
 * Demo mode for the learning flow. Deterministic sample content for the demo project
 * `proj_1` (alexchen-dev/shop-api), kept in memory per demo user, so the whole flow works
 * without an LLM key or database. Everything here is labelled sample in the UI.
 */
import type {
  AspectScores,
  Concept,
  ConceptsResponse,
  Course,
  GradedAnswer,
  LearningCertificate,
  LearningSummary,
  QuizAttempt,
} from '@/types/learning';
import type { StoredQuestion } from './quiz';
import { toPublic } from './quiz';
import { aspectScores, average, isUnlocked } from './score';

export const DEMO_PROJECT_ID = 'proj_1';
export const DEMO_REPO = 'alexchen-dev/shop-api';
export const SAMPLE_CERT_CODE = 'PJ-2026-A7X9K2';
/** Landing-page sample scores (average 71). */
export const SAMPLE_SCORES: AspectScores = {
  concept_understanding: 78,
  code_comprehension: 72,
  debugging: 64,
  architecture_design: 70,
  security_best_practices: 58,
  ai_collaboration: 81,
};

export const DEMO_FILES: { path: string; language: string; content: string }[] = [
  {
    path: 'src/routes/checkout.ts',
    language: 'typescript',
    content: `import { Router } from 'express';
import { z } from 'zod';
import { withIdempotency } from '../lib/idempotency';
import { createPaymentIntent } from '../lib/stripe';
import { db } from '../db';

const router = Router();

const CheckoutBody = z.object({
  cartId: z.string().uuid(),
  currency: z.enum(['inr', 'usd']),
});

router.post('/checkout', withIdempotency, async (req, res) => {
  const parsed = CheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid checkout body' });
  }

  const cart = await db.cart.findUnique({ where: { id: parsed.data.cartId } });
  if (!cart || cart.userId !== req.user.id) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  const amount = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const intent = await createPaymentIntent({
    amount,
    currency: parsed.data.currency,
    metadata: { cartId: cart.id },
  });

  await db.order.create({
    data: { cartId: cart.id, intentId: intent.id, status: 'pending', amount },
  });

  res.status(201).json({ clientSecret: intent.client_secret });
});

export default router;`,
  },
  {
    path: 'src/lib/idempotency.ts',
    language: 'typescript',
    content: `import type { Request, Response, NextFunction } from 'express';
import { redis } from './redis';

const TTL_SECONDS = 60 * 60 * 24;

export async function withIdempotency(req: Request, res: Response, next: NextFunction) {
  const key = req.header('Idempotency-Key');
  if (!key) return res.status(400).json({ error: 'Idempotency-Key header required' });

  const cacheKey = \`idem:\${req.user.id}:\${key}\`;
  const locked = await redis.set(cacheKey, 'pending', 'EX', TTL_SECONDS, 'NX');

  if (!locked) {
    const saved = await redis.get(cacheKey);
    if (saved === 'pending') return res.status(409).json({ error: 'Request in progress' });
    const { status, body } = JSON.parse(saved!);
    return res.status(status).json(body);
  }

  const json = res.json.bind(res);
  res.json = (body: unknown) => {
    redis.set(cacheKey, JSON.stringify({ status: res.statusCode, body }), 'EX', TTL_SECONDS);
    return json(body);
  };
  next();
}`,
  },
  {
    path: 'src/routes/webhooks.ts',
    language: 'typescript',
    content: `import { Router, raw } from 'express';
import Stripe from 'stripe';
import { db } from '../db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const router = Router();

router.post('/webhooks/stripe', raw({ type: 'application/json' }), async (req, res) => {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.header('stripe-signature')!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return res.status(400).send('Bad signature');
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    await db.order.updateMany({
      where: { intentId: intent.id, status: 'pending' },
      data: { status: 'paid' },
    });
  }

  res.json({ received: true });
});

export default router;`,
  },
  {
    path: 'src/lib/rateLimit.ts',
    language: 'typescript',
    content: `import { redis } from './redis';

/** Sliding-window limit: max \`limit\` requests per \`windowMs\` for one key. */
export async function allow(key: string, limit = 20, windowMs = 60_000): Promise<boolean> {
  const now = Date.now();
  const zkey = \`rl:\${key}\`;
  await redis.zremrangebyscore(zkey, 0, now - windowMs);
  const count = await redis.zcard(zkey);
  if (count >= limit) return false;
  await redis.zadd(zkey, now, \`\${now}:\${Math.random()}\`);
  await redis.pexpire(zkey, windowMs);
  return true;
}`,
  },
];

const ref = (path: string, startLine: number, endLine: number) => ({ path, startLine, endLine });

export const DEMO_CONCEPTS: Concept[] = [
  { id: 'c1', key: 'input-validation', name: 'Validating the checkout body with zod', category: 'API', difficulty: 'intro', position: 0, depends_on: [], files: [ref('src/routes/checkout.ts', 9, 18)], description: 'The checkout route parses the request body with a zod schema and rejects anything that is not a cart UUID plus a supported currency, before touching the database.' },
  { id: 'c2', key: 'ownership-check', name: 'Only your own cart: ownership check', category: 'Security', difficulty: 'intro', position: 1, depends_on: ['input-validation'], files: [ref('src/routes/checkout.ts', 20, 23)], description: 'The cart is loaded and compared with req.user.id; a cart that belongs to someone else returns 404 so its existence is not leaked.' },
  { id: 'c3', key: 'idempotency-keys', name: 'Idempotency keys on POST /checkout', category: 'Concurrency', difficulty: 'core', position: 2, depends_on: ['input-validation'], files: [ref('src/lib/idempotency.ts', 6, 26)], description: 'A Redis SET NX lock keyed by user and Idempotency-Key makes retries of the same checkout return the first response instead of charging twice.' },
  { id: 'c4', key: 'payment-intents', name: 'Creating a Stripe PaymentIntent', category: 'Payments', difficulty: 'core', position: 3, depends_on: ['ownership-check'], files: [ref('src/routes/checkout.ts', 25, 36)], description: 'The server computes the amount from the cart (never from the client), creates a PaymentIntent and stores a pending order linked to it.' },
  { id: 'c5', key: 'webhook-signatures', name: 'Verifying Stripe webhook signatures', category: 'Security', difficulty: 'advanced', position: 4, depends_on: ['payment-intents'], files: [ref('src/routes/webhooks.ts', 8, 18)], description: 'The webhook uses the raw body and the signing secret to prove the event came from Stripe before marking orders paid.' },
  { id: 'c6', key: 'sliding-window-rate-limit', name: 'Sliding-window rate limiting in Redis', category: 'Architecture', difficulty: 'advanced', position: 5, depends_on: [], files: [ref('src/lib/rateLimit.ts', 3, 13)], description: 'A Redis sorted set keeps request timestamps per key; old entries are trimmed so only the last window counts toward the limit.' },
];

function lesson(id: string, title: string, minutes: number, refs: Concept['files'], body: string, checks: string[]) {
  return { id, title, minutes, body_md: body, code_refs: refs, check_questions: checks };
}

const DEMO_MODULES: Course['modules'] = [
  {
    id: 'm1',
    title: 'Trusting nothing that comes in',
    concept_keys: ['input-validation', 'ownership-check'],
    lessons: [
      lesson('m1-input-validation', 'Why checkout parses its body first', 6, DEMO_CONCEPTS[0].files,
        `## What it does\n\n\`POST /checkout\` refuses any body that isn't a cart UUID and a currency you support.\n\n## Read the code\n\n\`\`\`ts\nconst CheckoutBody = z.object({\n  cartId: z.string().uuid(),\n  currency: z.enum(['inr', 'usd']),\n});\n\`\`\`\n\nIn \`src/routes/checkout.ts:15-18\`, \`safeParse\` returns a result instead of throwing, so you can answer with a clean 400.\n\n## Why it's written this way\n\nValidation happens **before** any database call. A bad request costs one CPU check instead of a query, and every line after it can trust \`parsed.data\`.\n\n## What breaks if you change it\n\nUse \`req.body.cartId\` directly and a string like \`"' OR 1=1"\` reaches your ORM. Prisma escapes it, but a raw query later would not.\n\n## Try it\n\nSend \`{ "cartId": "abc", "currency": "eur" }\`. You should get 400 before any log line from the database.`,
        ['Why use safeParse instead of parse here?', 'What happens to a request with currency "eur"?']),
      lesson('m1-ownership-check', 'Only your own cart', 5, DEMO_CONCEPTS[1].files,
        `## What it does\n\nAfter loading the cart, the route checks \`cart.userId !== req.user.id\`.\n\n## Read the code\n\n\`\`\`ts\nif (!cart || cart.userId !== req.user.id) {\n  return res.status(404).json({ error: 'Cart not found' });\n}\n\`\`\`\n\n## Why it's written this way\n\nIt returns **404, not 403**. A 403 would confirm the cart exists, which helps someone guessing IDs.\n\n## What breaks if you change it\n\nRemove the check and anyone with a cart ID can check out someone else's cart — an IDOR bug.\n\n## Try it\n\nLog in as a second user and post the first user's cart ID. You should get 404.`,
        ['Why 404 instead of 403?', 'What is this kind of bug called if the check is missing?']),
    ],
  },
  {
    id: 'm2',
    title: 'Charging exactly once',
    concept_keys: ['idempotency-keys', 'payment-intents', 'webhook-signatures'],
    lessons: [
      lesson('m2-idempotency-keys', 'Idempotency keys stop double charges', 9, DEMO_CONCEPTS[2].files,
        `## What it does\n\nIf a phone retries \`POST /checkout\` on a flaky network, the second request gets the **first** response instead of creating a second order.\n\n## Read the code\n\n\`\`\`ts\nconst locked = await redis.set(cacheKey, 'pending', 'EX', TTL_SECONDS, 'NX');\n\`\`\`\n\n\`NX\` means "only set if missing". The first request wins the lock (\`src/lib/idempotency.ts:11\`); later ones read the saved response.\n\n## Why it's written this way\n\nThe key includes \`req.user.id\` so two users can't collide on the same key. The response is saved by wrapping \`res.json\`.\n\n## What breaks if you change it\n\nIf a request crashes after taking the lock, the key stays \`pending\` for 24 hours and every retry gets 409. A shorter TTL for the pending state would fix that.\n\n## Try it\n\nSend the same Idempotency-Key twice quickly. The second call returns 409 or the same body.`,
        ['What does NX do in the Redis SET?', 'What happens to retries if the first request crashes?', 'Why is the user id in the key?']),
      lesson('m2-payment-intents', 'Server decides the amount', 7, DEMO_CONCEPTS[3].files,
        `## What it does\n\nThe amount is summed from the cart on the server (\`src/routes/checkout.ts:25\`), then sent to Stripe.\n\n## Read the code\n\n\`\`\`ts\nconst amount = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);\n\`\`\`\n\n## Why it's written this way\n\nNever trust a price from the browser. The order is stored as \`pending\` until Stripe confirms payment.\n\n## What breaks if you change it\n\nRead \`amount\` from \`req.body\` and anyone can pay ₹1 for anything.\n\n## Try it\n\nChange an item's price in the database and check the PaymentIntent amount follows it.`,
        ['Why is the order saved as pending?', 'Where does the amount come from?']),
      lesson('m2-webhook-signatures', 'Proving the webhook is from Stripe', 8, DEMO_CONCEPTS[4].files,
        `## What it does\n\n\`constructEvent\` checks the \`stripe-signature\` header against the raw body and your signing secret.\n\n## Why it's written this way\n\nThe route uses \`raw()\` because signature checks need the exact bytes. Parsed JSON would change them.\n\n## What breaks if you change it\n\nSkip verification and anyone can POST a fake \`payment_intent.succeeded\` and mark orders paid.\n\n## Try it\n\nSend the same event with one byte changed. You should get 400 Bad signature.`,
        ['Why must the body be raw here?', 'What does updateMany with status "pending" protect against?']),
    ],
  },
  {
    id: 'm3',
    title: 'Staying up under load',
    concept_keys: ['sliding-window-rate-limit'],
    lessons: [
      lesson('m3-sliding-window-rate-limit', 'Sliding-window rate limits', 8, DEMO_CONCEPTS[5].files,
        `## What it does\n\n\`allow(key)\` lets through at most 20 requests per minute for one key.\n\n## Read the code\n\nOld timestamps are removed with \`zremrangebyscore\`, then \`zcard\` counts what's left (\`src/lib/rateLimit.ts:6-8\`).\n\n## Why it's written this way\n\nA sliding window avoids the burst a fixed window allows at the minute boundary.\n\n## What breaks if you change it\n\nThe check and the add are separate calls, so two requests at once can both pass at 19. A Lua script or MULTI would make it atomic.\n\n## Try it\n\nFire 25 requests in parallel and count how many get through.`,
        ['Why can two parallel requests both pass at the limit?', 'What does pexpire clean up?']),
    ],
  },
];

const Q = (q: Partial<StoredQuestion> & Pick<StoredQuestion, 'id' | 'aspect' | 'type' | 'prompt_md' | 'answer_key'>): StoredQuestion => ({
  code: null,
  options: null,
  correct_index: null,
  rubric: [{ point: 'Explains the key idea correctly', weight: 3 }, { point: 'Refers to the actual code', weight: 2 }],
  concept_key: 'idempotency-keys',
  ...q,
});

const snip = (path: string, s: number, e: number) => {
  const f = DEMO_FILES.find((x) => x.path === path)!;
  return { path, startLine: s, endLine: e, snippet: f.content.split('\n').slice(s - 1, e).join('\n') };
};

export const DEMO_QUESTIONS: StoredQuestion[] = [
  Q({ id: 'q1', aspect: 'concept_understanding', type: 'mcq', prompt_md: 'What problem do idempotency keys solve in `POST /checkout`?', options: ['They make the request faster', 'They stop a retried request from creating a second order', 'They encrypt the cart', 'They validate the currency'], correct_index: 1, answer_key: 'A retried request with the same key gets the first response instead of creating a second order and charge.' }),
  Q({ id: 'q2', aspect: 'concept_understanding', type: 'free_text', prompt_md: 'Why does the checkout route return **404** instead of **403** when the cart belongs to another user?', code: snip('src/routes/checkout.ts', 20, 23), answer_key: 'A 403 confirms the cart exists; 404 hides that, so IDs cannot be probed.', rubric: [{ point: 'Says 403 reveals the cart exists', weight: 3 }, { point: 'Mentions probing or guessing IDs', weight: 2 }], concept_key: 'ownership-check' }),
  Q({ id: 'q3', aspect: 'code_comprehension', type: 'mcq', prompt_md: 'In `withIdempotency`, what does the second request with the same key get while the first is still running?', code: snip('src/lib/idempotency.ts', 11, 16), options: ['A new order', 'HTTP 409 "Request in progress"', 'HTTP 500', 'The first request is cancelled'], correct_index: 1, answer_key: 'The key still holds "pending", so it returns 409.' }),
  Q({ id: 'q4', aspect: 'code_comprehension', type: 'what_if', prompt_md: 'What happens if the first request **crashes** after `redis.set(..., NX)` succeeds but before it responds?', code: snip('src/lib/idempotency.ts', 6, 16), answer_key: 'The key stays "pending" for the full 24h TTL, so every retry gets 409 until it expires. A shorter pending TTL or cleanup on error fixes it.', rubric: [{ point: 'Key stays pending', weight: 2 }, { point: 'Retries get 409 until TTL', weight: 2 }, { point: 'Suggests shorter TTL or cleanup', weight: 1 }] }),
  Q({ id: 'q5', aspect: 'debugging', type: 'find_the_bug', prompt_md: 'One line in this copy of the webhook handler has a bug. Find it and explain the effect.', code: { ...snip('src/routes/webhooks.ts', 20, 26), snippet: `  if (event.type === 'payment_intent.succeeded') {\n    const intent = event.data.object as Stripe.PaymentIntent;\n    await db.order.updateMany({\n      where: { intentId: intent.id },\n      data: { status: 'paid' },\n    });\n  }` }, answer_key: "The where clause dropped status: 'pending', so a replayed or late event can flip refunded/cancelled orders back to paid.", rubric: [{ point: "Spots the missing status: 'pending' filter", weight: 3 }, { point: 'Explains replay/late event effect', weight: 2 }], concept_key: 'webhook-signatures' }),
  Q({ id: 'q6', aspect: 'debugging', type: 'find_the_bug', prompt_md: 'This version of the rate limiter lets too many requests through. Why?', code: { ...snip('src/lib/rateLimit.ts', 4, 13), snippet: `export async function allow(key: string, limit = 20, windowMs = 60_000): Promise<boolean> {\n  const now = Date.now();\n  const zkey = \`rl:\${key}\`;\n  await redis.zremrangebyscore(zkey, 0, now - windowMs);\n  const count = await redis.zcard(zkey);\n  if (count > limit) return false;\n  await redis.zadd(zkey, now, \`\${now}:\${Math.random()}\`);\n  await redis.pexpire(zkey, windowMs);\n  return true;\n}` }, answer_key: '`count > limit` should be `>=`; with `>` one extra request (21) passes per window.', rubric: [{ point: 'Finds > vs >= off-by-one', weight: 3 }, { point: 'Says one extra request passes', weight: 2 }], concept_key: 'sliding-window-rate-limit' }),
  Q({ id: 'q7', aspect: 'architecture_design', type: 'free_text', prompt_md: 'Why is the order created as `pending` at checkout and only marked `paid` in the webhook?', answer_key: 'Payment is confirmed asynchronously by Stripe; the webhook is the source of truth, so the order waits for it.', rubric: [{ point: 'Payment confirmation is async', weight: 3 }, { point: 'Webhook is source of truth', weight: 2 }], concept_key: 'payment-intents' }),
  Q({ id: 'q8', aspect: 'architecture_design', type: 'what_if', prompt_md: 'What if you moved idempotency from Redis into a Postgres table with a unique constraint?', answer_key: 'Durable across Redis restarts and transactional with the order, but slower and needs cleanup of old keys.', rubric: [{ point: 'Durability / transactional benefit', weight: 2 }, { point: 'Cost: latency or cleanup', weight: 2 }] }),
  Q({ id: 'q9', aspect: 'security_best_practices', type: 'mcq', prompt_md: 'Why does the webhook route use `raw({ type: "application/json" })`?', code: snip('src/routes/webhooks.ts', 8, 18), options: ['It is faster', 'Signature verification needs the exact raw bytes', 'Stripe sends XML', 'To skip authentication'], correct_index: 1, answer_key: 'The signature is computed over the raw body; parsed JSON changes the bytes.', concept_key: 'webhook-signatures' }),
  Q({ id: 'q10', aspect: 'security_best_practices', type: 'free_text', prompt_md: 'Why is the amount computed from the cart on the server instead of read from the request?', code: snip('src/routes/checkout.ts', 25, 30), answer_key: 'A client can send any amount; computing it server-side from stored prices prevents paying less.', rubric: [{ point: 'Client input can be tampered', weight: 3 }, { point: 'Server uses stored prices', weight: 2 }], concept_key: 'payment-intents' }),
  Q({ id: 'q11', aspect: 'ai_collaboration', type: 'free_text', prompt_md: 'An AI assistant suggests replacing `safeParse` with `req.body as CheckoutBody` "to simplify". What would you reply, and what would you ask it instead?', code: snip('src/routes/checkout.ts', 14, 18), answer_key: 'Reject it: a type cast does no runtime validation. Ask for a shared schema or better error messages, keeping runtime checks.', rubric: [{ point: 'Cast gives no runtime validation', weight: 3 }, { point: 'Proposes a better prompt/alternative', weight: 2 }], concept_key: 'input-validation' }),
  Q({ id: 'q12', aspect: 'ai_collaboration', type: 'what_if', prompt_md: 'AI generated `allow()` for you. Before shipping it, what would you test, and what weakness should you ask the AI to fix?', answer_key: 'Test parallel requests at the limit; the check-then-add is not atomic, so ask for a Lua script or MULTI.', rubric: [{ point: 'Concurrent test at the limit', weight: 2 }, { point: 'Names the race / non-atomic issue', weight: 3 }], concept_key: 'sliding-window-rate-limit' }),
];

// ── in-memory demo state (per demo user) ─────────────────────────────────────
interface DemoState {
  concepts: 'none' | 'ready';
  course: boolean;
  done: Set<string>;
  attempts: { id: string; no: number; answers: Record<string, GradedAnswer>; submitted_at: string | null; created_at: string; scores: AspectScores | null }[];
  cert: boolean;
}
const g = globalThis as unknown as { __projustDemo?: Map<string, DemoState> };
const store = (g.__projustDemo ??= new Map());
function st(uid: string): DemoState {
  let s = store.get(uid);
  if (!s) store.set(uid, (s = { concepts: 'none', course: false, done: new Set(), attempts: [], cert: false }));
  return s;
}

export const isDemoProject = (id: string) => id === DEMO_PROJECT_ID;

export function demoConcepts(uid: string): ConceptsResponse {
  const s = st(uid);
  return s.concepts === 'ready'
    ? { status: 'ready', detail: `${DEMO_CONCEPTS.length} concepts mapped`, progress: 1, concepts: DEMO_CONCEPTS }
    : { status: 'none', detail: null, progress: 0, concepts: [] };
}
export function demoStartConcepts(uid: string): ConceptsResponse {
  st(uid).concepts = 'ready';
  return demoConcepts(uid);
}

export function demoCourse(uid: string): Course | null {
  const s = st(uid);
  if (!s.course) return null;
  return {
    id: 'demo-course',
    project_id: DEMO_PROJECT_ID,
    title: 'Understanding your checkout service',
    status: 'ready',
    status_detail: '6 lessons',
    progress: 1,
    modules: DEMO_MODULES,
    completed_lesson_ids: Array.from(s.done),
    updated_at: new Date().toISOString(),
  };
}
export function demoStartCourse(uid: string): Course {
  st(uid).course = true;
  return demoCourse(uid)!;
}
export function demoLessonDone(uid: string, lessonId: string, done: boolean): string[] {
  const s = st(uid);
  if (done) s.done.add(lessonId);
  else s.done.delete(lessonId);
  return Array.from(s.done);
}

function toAttempt(uid: string, a: DemoState['attempts'][number]): QuizAttempt {
  const avg = a.scores ? average(a.scores) : null;
  const unlocked = a.scores ? isUnlocked(a.scores) : false;
  return {
    id: a.id,
    project_id: DEMO_PROJECT_ID,
    attempt_no: a.no,
    status: a.submitted_at ? 'submitted' : 'ready',
    status_detail: `${DEMO_QUESTIONS.length} questions`,
    questions: DEMO_QUESTIONS.map(toPublic),
    answers: a.answers,
    scores: a.scores,
    average: avg,
    unlocked,
    created_at: a.created_at,
    submitted_at: a.submitted_at,
    certificate_code: unlocked && st(uid).cert ? SAMPLE_CERT_CODE : null,
  };
}
export function demoAttempts(uid: string): QuizAttempt[] {
  return st(uid).attempts.map((a) => toAttempt(uid, a)).reverse();
}
export function demoAttempt(uid: string, attemptId: string): QuizAttempt | null {
  const a = st(uid).attempts.find((x) => x.id === attemptId);
  return a ? toAttempt(uid, a) : null;
}
export function demoStartAttempt(uid: string): QuizAttempt | { error: string; status: number } {
  const s = st(uid);
  if (s.concepts !== 'ready') return { error: 'Map the concepts first.', status: 409 };
  if (s.attempts.some((a) => !a.submitted_at)) return { error: 'Finish your current attempt first.', status: 409 };
  const a = { id: `demo-attempt-${s.attempts.length + 1}`, no: s.attempts.length + 1, answers: {}, submitted_at: null, created_at: new Date().toISOString(), scores: null };
  s.attempts.push(a);
  return toAttempt(uid, a);
}

/** Demo grading: MCQ exact; text answers by rubric keyword coverage. No LLM. */
function demoGrade(q: StoredQuestion, answer: string): GradedAnswer {
  const now = new Date().toISOString();
  const text = answer.trim().toLowerCase();
  if (q.type === 'mcq') {
    const ok = Number(text) === q.correct_index;
    return { answer, score: ok ? 100 : 0, feedback_md: `${ok ? 'Correct.' : 'Not quite.'} ${q.answer_key}`, study_tip: 'Re-read the lesson for this concept.', rubric_hits: q.rubric.map((r) => ({ point: r.point, hit: ok })), graded_at: now };
  }
  const words = (s: string) => s.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
  const keyWords = new Set(words(q.answer_key + ' ' + q.rubric.map((r) => r.point).join(' ')));
  const hits = q.rubric.map((r) => ({ point: r.point, hit: words(r.point).some((w) => text.includes(w)) }));
  const coverage = words(text).filter((w) => keyWords.has(w)).length;
  const total = q.rubric.reduce((t, r) => t + r.weight, 0);
  const rubricScore = q.rubric.reduce((t, r, i) => t + (hits[i].hit ? r.weight : 0), 0) / total;
  const score = text.length < 12 ? 0 : Math.round(Math.min(100, 35 * Math.min(1, coverage / 4) + 65 * rubricScore));
  return { answer, score, feedback_md: `${score >= 70 ? 'Good answer.' : 'Partly there.'} The key idea: ${q.answer_key}`, study_tip: 'Point to the exact lines and explain what would break.', rubric_hits: hits, graded_at: now };
}

export function demoAnswer(uid: string, attemptId: string, questionId: string, answer: string): GradedAnswer | { error: string; status: number } {
  const a = st(uid).attempts.find((x) => x.id === attemptId);
  if (!a) return { error: 'Attempt not found', status: 404 };
  if (a.submitted_at) return { error: 'This attempt is already submitted.', status: 409 };
  const q = DEMO_QUESTIONS.find((x) => x.id === questionId);
  if (!q) return { error: 'Question not found', status: 404 };
  const graded = demoGrade(q, answer);
  a.answers[questionId] = graded;
  return graded;
}

export function demoSubmit(uid: string, attemptId: string): QuizAttempt | { error: string; status: number } {
  const s = st(uid);
  const a = s.attempts.find((x) => x.id === attemptId);
  if (!a) return { error: 'Attempt not found', status: 404 };
  if (!a.submitted_at) {
    const missing = DEMO_QUESTIONS.filter((q) => !a.answers[q.id]);
    if (missing.length) return { error: `Answer all questions first (${missing.length} left).`, status: 409 };
    a.scores = aspectScores(DEMO_QUESTIONS.map((q) => ({ aspect: q.aspect, score: a.answers[q.id].score })));
    a.submitted_at = new Date().toISOString();
    if (isUnlocked(a.scores)) s.cert = true;
  }
  return toAttempt(uid, a);
}

export function sampleCertificate(): LearningCertificate {
  return {
    code: SAMPLE_CERT_CODE,
    recipient_name: 'Alex Chen',
    repo_full_name: DEMO_REPO,
    project_id: DEMO_PROJECT_ID,
    commit_sha: 'a8b34c1',
    level: 'Course-verified',
    scores: SAMPLE_SCORES,
    overall: average(SAMPLE_SCORES),
    ownership_pct: 86,
    concepts: DEMO_CONCEPTS.map((c, i) => ({ name: c.name, category: c.category, strength: i % 3 === 0 ? 'advanced' : 'proficient' })),
    version: 2,
    history: [
      { version: 1, overall: 49, scores: { concept_understanding: 52, code_comprehension: 48, debugging: 38, architecture_design: 55, security_best_practices: 41, ai_collaboration: 60 }, commit_sha: '91c0e2f', at: '2026-03-02T10:00:00Z' },
      { version: 2, overall: average(SAMPLE_SCORES), scores: SAMPLE_SCORES, commit_sha: 'a8b34c1', at: '2026-03-09T16:20:00Z' },
    ],
    issued_at: '2026-03-02T10:00:00Z',
    updated_at: '2026-03-09T16:20:00Z',
    sample: true,
  };
}

export function demoSummaries(uid: string, projects: { id: string; repo_full_name: string }[]): LearningSummary[] {
  return projects.map((p) => {
    if (!isDemoProject(p.id)) return { project_id: p.id, repo_full_name: p.repo_full_name, concepts_status: 'none', course: null, latest_attempt: null, certificate_code: null };
    const s = st(uid);
    const lessons = DEMO_MODULES.reduce((t, m) => t + m.lessons.length, 0);
    const last = demoAttempts(uid)[0];
    return {
      project_id: p.id,
      repo_full_name: p.repo_full_name,
      concepts_status: s.concepts,
      course: s.course ? { status: 'ready', lessons_total: lessons, lessons_done: s.done.size, title: 'Understanding your checkout service' } : null,
      latest_attempt: last ? { attempt_no: last.attempt_no, status: last.status, average: last.average, unlocked: last.unlocked } : null,
      certificate_code: s.cert ? SAMPLE_CERT_CODE : null,
    };
  });
}

export function demoHasCert(uid: string): boolean {
  return st(uid).cert;
}

/** Project status payload for the demo project page (shape of /api/projects/[id]/status). */
export function demoProjectStatus() {
  return {
    id: DEMO_PROJECT_ID,
    repo_full_name: DEMO_REPO,
    repo_url: `https://github.com/${DEMO_REPO}`,
    default_branch: 'main',
    commit_sha: 'a8b34c1',
    primary_language: 'TypeScript',
    status: 'ready',
    status_detail: 'Sample project',
    file_count: DEMO_FILES.length,
    ownership_pct: 86,
    ownership_status: 'verified',
    summary: {
      oneLiner: 'Checkout API that charges each order exactly once, with Stripe webhooks and Redis rate limits.',
      projectType: 'Node.js REST API',
      techStack: [
        { name: 'Express', role: 'HTTP server' },
        { name: 'Stripe', role: 'Payments' },
        { name: 'Redis', role: 'Idempotency and rate limits' },
        { name: 'Prisma', role: 'Database access' },
      ],
      architecture:
        'Express routes validate input with zod, check cart ownership and create Stripe PaymentIntents. An idempotency middleware stores the first response per key in Redis so retries never double-charge. Stripe webhooks, verified by signature, mark orders paid.',
      entryPoints: [{ path: 'src/routes/checkout.ts', why: 'POST /checkout' }],
      keyFlows: [
        { name: 'Checkout', description: 'Validate, check ownership, create intent, save pending order', files: ['src/routes/checkout.ts', 'src/lib/idempotency.ts'] },
        { name: 'Payment confirmation', description: 'Verified webhook marks the order paid', files: ['src/routes/webhooks.ts'] },
      ],
      notableFiles: DEMO_FILES.map((f) => ({ path: f.path, purpose: f.language })),
      complexity: 'intermediate',
      suggestedQuestions: [
        'What happens if a client retries POST /checkout?',
        'Why does the webhook need the raw request body?',
        'Can two parallel requests both pass the rate limit?',
      ],
    },
  };
}

export function demoProjectFiles() {
  return DEMO_FILES.map((f) => ({
    path: f.path,
    language: f.language,
    size_bytes: f.content.length,
    line_count: f.content.split('\n').length,
    content: f.content,
  }));
}
