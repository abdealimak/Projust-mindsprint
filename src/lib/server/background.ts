import { waitUntil } from '@vercel/functions';

/**
 * Start work that continues after the HTTP response (AI jobs, ingestion).
 *
 * On Vercel the function is kept alive until the job finishes (up to the route's maxDuration),
 * instead of being frozen as soon as the response is sent. On a normal Node server (`next start`,
 * local dev) waitUntil is a no-op and the promise simply keeps running.
 */
export function runAfterResponse(name: string, job: () => Promise<unknown>) {
  const p = job().catch((err) => {
    console.error(`[job] ${name} failed:`, err instanceof Error ? err.message : err);
  });
  try {
    waitUntil(p);
  } catch {
    // Not running on Vercel: nothing to register
  }
}
