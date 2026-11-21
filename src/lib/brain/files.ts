import type { CodeRef } from '@/types/learning';

export interface SourceFile {
  path: string;
  language: string | null;
  content: string;
  priority: number;
  line_count: number;
}

/** "12 | code" numbered view so the model can cite exact lines. */
export function numbered(file: SourceFile, start = 1, end?: number): string {
  const lines = file.content.split('\n');
  const last = Math.min(end ?? lines.length, lines.length);
  const out: string[] = [];
  for (let i = start; i <= last; i++) out.push(`${i} | ${lines[i - 1]}`);
  return out.join('\n');
}

/**
 * Split files into chunks that fit a character budget (≈ 4 chars/token).
 * Big files are cut into line windows so every chunk keeps real line numbers.
 */
export function chunkFiles(files: SourceFile[], budgetChars: number): string[] {
  const chunks: string[] = [];
  let cur = '';
  const push = (block: string) => {
    if (cur.length + block.length > budgetChars && cur) {
      chunks.push(cur);
      cur = '';
    }
    cur += block;
  };
  for (const f of files) {
    const lines = f.content.split('\n');
    const header = (s: number, e: number) => `\n### ${f.path} (lines ${s}-${e})\n`;
    const full = header(1, lines.length) + numbered(f) + '\n';
    if (full.length <= budgetChars) {
      push(full);
      continue;
    }
    // window by lines
    let s = 1;
    while (s <= lines.length) {
      let e = s;
      let size = 0;
      while (e <= lines.length && size + lines[e - 1].length + 8 < budgetChars - 200) {
        size += lines[e - 1].length + 8;
        e++;
      }
      const end = Math.max(s, e - 1);
      push(header(s, end) + numbered(f, s, end) + '\n');
      s = end + 1;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/** Keep only refs that point at real files and clamp line ranges to the file. */
export function cleanRefs(refs: CodeRef[] | undefined, files: Map<string, SourceFile>, max = 6): CodeRef[] {
  const out: CodeRef[] = [];
  const seen = new Set<string>();
  for (const r of refs || []) {
    const f = files.get(r.path);
    if (!f) continue;
    const total = Math.max(1, f.line_count || f.content.split('\n').length);
    let s = Math.max(1, Math.min(Math.floor(r.startLine) || 1, total));
    let e = Math.max(1, Math.min(Math.floor(r.endLine) || s, total));
    if (e < s) [s, e] = [e, s];
    if (e - s > 80) e = s + 80;
    const k = `${r.path}:${s}-${e}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ path: r.path, startLine: s, endLine: e });
    if (out.length >= max) break;
  }
  return out;
}

export function snippet(file: SourceFile, ref: CodeRef): string {
  return file.content.split('\n').slice(ref.startLine - 1, ref.endLine).join('\n');
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'concept';
}
