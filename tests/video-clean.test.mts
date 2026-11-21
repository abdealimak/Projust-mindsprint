/**
 * Video input cleanup tests (src/components/video/clean.ts). Run:
 *   node --import ./tests/alias.mjs --experimental-strip-types --no-warnings tests/video-clean.test.mts
 * Bad AI output or odd files must never reach the videos as NaN, null or overflowing text.
 */
import { cleanExplainer, cleanCertificate, plain, capWords, MAX_CODE_COLS } from '@/components/video/clean';

let pass = 0;
let fail = 0;
function ok(name: string, cond: unknown) {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

// plain(): markdown out, real names kept
ok('plain strips bold and code marks', plain('**Use** `zod` here') === 'Use zod here');
ok('plain keeps snake_case and C#', plain('my_repo in C#') === 'my_repo in C#');
ok('plain unwraps links and wiki links', plain('[docs](http://x) and [[auth-flow]]') === 'docs and auth-flow');
ok('plain drops heading marker', plain('## Title') === 'Title');
ok('plain handles non-strings', plain(undefined) === '' && plain(42) === '');

// capWords(): short stays, long ends on a sentence or an ellipsis
ok('capWords keeps short text', capWords('one two three', 5) === 'one two three');
const long = Array.from({ length: 80 }, (_, i) => `w${i}`).join(' ');
ok('capWords cuts long text', capWords(long, 10).split(' ').length === 10 && capWords(long, 10).endsWith('…'));

// cleanExplainer(): empty and messy data
const e = cleanExplainer({ kicker: '', title: '', summary: '' });
ok('explainer has a title fallback', e.title.length > 0 && e.summary === e.title);
ok('explainer code null when missing', e.code === null);
ok('explainer lists default empty', Array.isArray(e.buildsOn) && e.buildsOn.length === 0);

const code = cleanExplainer({
  kicker: 'Security',
  title: 'Auth',
  summary: 'x',
  code: { path: 'a.ts', startLine: 10, text: '\n\n\t\tif (a) {\n\t\t\treturn b;\n\t\t}\n\n' + '' },
});
ok('code trims blank top lines and shifts start', code.code?.startLine === 12);
ok('code removes shared indent', code.code?.text.startsWith('if (a) {'));
ok('code drops trailing blanks', !code.code?.text.endsWith('\n'));

const wide = cleanExplainer({ kicker: 'k', title: 't', summary: 's', code: { path: 'a.ts', startLine: 1, text: 'x'.repeat(300) } });
ok('code cuts very long lines', (wide.code?.text.length || 0) === MAX_CODE_COLS);
ok('code with only blanks becomes null', cleanExplainer({ kicker: 'k', title: 't', summary: 's', code: { path: 'a.ts', startLine: 1, text: '  \n \n' } }).code === null);
ok('bad start line becomes 1', cleanExplainer({ kicker: 'k', title: 't', summary: 's', code: { path: 'a.ts', startLine: NaN, text: 'a' } }).code?.startLine === 1);

const links = cleanExplainer({ kicker: 'k', title: 't', summary: 's', buildsOn: ['A', 'A', '', '**B**'] });
ok('links dedupe and drop empty', JSON.stringify(links.buildsOn) === '["A","B"]');

// cleanCertificate(): partial scores never become NaN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cert = cleanCertificate({ code: 'PJ-1', recipientName: '', repo: '', level: '', scores: { concept_understanding: 80 } as any, overall: NaN });
const vals = Object.values(cert.scores);
ok('cert fills every score', vals.length === 6 && vals.every((v) => Number.isFinite(v)));
ok('cert overall is a number', Number.isFinite(cert.overall));
ok('cert name and repo have fallbacks', cert.recipientName.length > 0 && cert.repo.length > 0);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ok('cert scores clamp to 0..100', cleanCertificate({ code: 'x', recipientName: 'a', repo: 'r', level: 'l', scores: { concept_understanding: 500, code_comprehension: -5 } as any, overall: 70 }).scores.concept_understanding === 100);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
