import { ASPECTS, type AspectScores } from '@/types/learning';
import type { ExplainerProps } from './ConceptExplainer';
import type { CertificateRevealProps } from './CertificateReveal';

/**
 * Make video props safe for any repo. Data comes from AI output and indexed files, so text
 * can be long, hold markdown, or be missing; code can have tabs, blank edges or very long
 * lines; scores can be partial. The videos assume clean input, so everything passes here
 * first (players.tsx).
 */

/** Plain text: no markdown marks, wiki links or extra spaces. */
export function plain(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(^|\n)\s*(#{1,6}|>)\s+/g, '$1') // heading / quote markers only, so "C#" stays
    .replace(/\*\*|__|~~|`|\*/g, '') // emphasis and code marks; single "_" stays for snake_case names
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cut to at most `max` words, ending on a sentence when one ends late enough. */
export function capWords(s: string, max: number): string {
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length <= max) return s;
  const cut = words.slice(0, max).join(' ');
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  if (end > cut.length * 0.5) return cut.slice(0, end + 1);
  return `${cut.replace(/[,;:]$/, '')}…`;
}

const capChars = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, '')}…`);

/** Longest code line the video shows before cutting it with an ellipsis. */
export const MAX_CODE_COLS = 110;

function cleanCode(code: ExplainerProps['code']): ExplainerProps['code'] {
  if (!code || typeof code.text !== 'string' || !code.path) return null;
  let start = Number.isFinite(code.startLine) && code.startLine > 0 ? Math.floor(code.startLine) : 1;
  const lines = code.text
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '  ')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''));
  while (lines.length && !lines[0].trim()) {
    lines.shift();
    start++;
  }
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (!lines.length) return null;
  // Drop the shared indent so nested code is not pushed off the right edge
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  const text = lines
    .map((l) => l.slice(Math.min(indent, l.match(/^ */)![0].length)))
    .map((l) => (l.length > MAX_CODE_COLS ? `${l.slice(0, MAX_CODE_COLS - 1)}…` : l))
    .join('\n');
  return { path: code.path, startLine: start, text };
}

const cleanList = (xs: unknown): string[] =>
  Array.isArray(xs) ? Array.from(new Set(xs.map((x) => capChars(plain(x), 48)).filter(Boolean))) : [];

export function cleanExplainer(p: ExplainerProps): ExplainerProps {
  const title = capChars(plain(p.title), 90) || 'This concept';
  const summary = capWords(plain(p.summary), 60) || title;
  const question = p.question ? capChars(plain(p.question), 200) : null;
  return {
    kicker: capChars(plain(p.kicker), 60) || 'Projust',
    title,
    summary,
    repo: p.repo ? plain(p.repo) : null,
    code: cleanCode(p.code),
    buildsOn: cleanList(p.buildsOn),
    leadsTo: cleanList(p.leadsTo),
    question: question || null,
  };
}

const score = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0);

export function cleanCertificate(p: CertificateRevealProps): CertificateRevealProps {
  const scores = Object.fromEntries(ASPECTS.map((a) => [a, score(p.scores?.[a])])) as AspectScores;
  const avg = ASPECTS.reduce((s, a) => s + scores[a], 0) / ASPECTS.length;
  return {
    ...p,
    code: p.code || '',
    recipientName: capChars(plain(p.recipientName), 40) || 'Projust learner',
    repo: plain(p.repo) || 'their repository',
    commitSha: p.commitSha || null,
    level: plain(p.level) || 'Verified',
    scores,
    overall: Math.round(score(Number.isFinite(p.overall) ? p.overall : avg)),
  };
}
