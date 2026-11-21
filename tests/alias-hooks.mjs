// Resolve "@/x" to src/x(.ts|.tsx|/index.ts) so node --experimental-strip-types can run src code in tests.
import { existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const tryFile = (base) => ['', '.ts', '.tsx', '/index.ts'].map((e) => base + e).find((p) => existsSync(p) && !p.endsWith(path.sep));
export async function resolve(specifier, context, next) {
  if (process.env.FAKE_SUPABASE === '1' && specifier === '@/lib/supabase/server') {
    return next(pathToFileURL(path.join(root, '..', 'tests', 'fake-supabase.mts')).href, context);
  }
  if (specifier.startsWith('@/')) {
    const f = tryFile(path.join(root, specifier.slice(2)));
    if (f) return next(pathToFileURL(f).href, context);
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.includes('/src/') && !path.extname(specifier)) {
    const f = tryFile(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier));
    if (f) return next(pathToFileURL(f).href, context);
  }
  // next/* subpaths are CJS files without an exports map
  if (/^next\/[a-z-]+$/.test(specifier)) return next(specifier + '.js', context);
  return next(specifier, context);
}
