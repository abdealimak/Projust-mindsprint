/**
 * Small, dependency-free syntax highlighter for the code viewer, quiz snippets and lesson code.
 * It is a line tokenizer (keywords, strings, comments, numbers, calls, types) with state carried
 * across lines for block comments and multi-line strings. Good enough to make code readable;
 * it is not a parser.
 */

export type TokKind = 'plain' | 'kw' | 'str' | 'com' | 'num' | 'fn' | 'type' | 'key' | 'tag' | 'attr' | 'punct';
export interface Tok {
  k: TokKind;
  t: string;
}

export type Lang = 'js' | 'py' | 'go' | 'rust' | 'c' | 'json' | 'css' | 'shell' | 'yaml' | 'sql' | 'markup' | 'plain';

interface Spec {
  kw: Set<string>;
  line: string[];
  block: [string, string][];
  quotes: string[];
  /** Quote delimiters that may span lines (template literals, python triple quotes). */
  multi: string[];
}

const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

const JS_KW = words(
  'import export from as default const let var function return if else for while do switch case break continue new delete typeof instanceof in of class extends super this null undefined true false try catch finally throw async await yield void interface type enum implements private public protected readonly static abstract declare namespace module keyof infer satisfies is get set'
);
const PY_KW = words(
  'def return if elif else for while in not and or is None True False import from as class try except finally raise with lambda yield pass break continue global nonlocal assert del async await self match case'
);
const GO_KW = words(
  'package import func return if else for range switch case default break continue go defer select chan map struct interface type const var nil true false fallthrough goto'
);
const RUST_KW = words(
  'fn let mut const static pub use mod crate super self Self struct enum impl trait for in while loop if else match return break continue as where async await move ref dyn type unsafe extern true false Some None Ok Err'
);
const C_KW = words(
  'int long short char float double void bool boolean byte unsigned signed const static final public private protected class interface extends implements new return if else for while do switch case break continue default try catch finally throw throws null true false this super import package namespace using struct enum typedef sizeof var val fun override virtual abstract'
);
const SQL_KW = words(
  'select from where and or not insert into values update set delete create table alter drop index primary key foreign references join left right inner outer on group by order having limit offset as distinct null is in like between exists case when then else end returning default unique constraint cascade begin commit rollback with union all'
);
const SHELL_KW = words('if then else elif fi for in do done while until case esac function return export local echo cd exit set unset source');

const SPECS: Record<Exclude<Lang, 'markup' | 'plain'>, Spec> = {
  js: { kw: JS_KW, line: ['//'], block: [['/*', '*/']], quotes: ['"', "'", '`'], multi: ['`'] },
  py: { kw: PY_KW, line: ['#'], block: [], quotes: ['"""', "'''", '"', "'"], multi: ['"""', "'''"] },
  go: { kw: GO_KW, line: ['//'], block: [['/*', '*/']], quotes: ['"', "'", '`'], multi: ['`'] },
  rust: { kw: RUST_KW, line: ['//'], block: [['/*', '*/']], quotes: ['"'], multi: [] },
  c: { kw: C_KW, line: ['//'], block: [['/*', '*/']], quotes: ['"', "'"], multi: [] },
  json: { kw: words('true false null'), line: ['//'], block: [], quotes: ['"'], multi: [] },
  css: { kw: words('important'), line: [], block: [['/*', '*/']], quotes: ['"', "'"], multi: [] },
  shell: { kw: SHELL_KW, line: ['#'], block: [], quotes: ['"', "'"], multi: [] },
  yaml: { kw: words('true false null yes no on off'), line: ['#'], block: [], quotes: ['"', "'"], multi: [] },
  sql: { kw: SQL_KW, line: ['--'], block: [['/*', '*/']], quotes: ["'", '"'], multi: [] },
};

const EXT: Record<string, Lang> = {
  ts: 'js', tsx: 'js', js: 'js', jsx: 'js', mjs: 'js', cjs: 'js', mts: 'js', cts: 'js', svelte: 'markup', vue: 'markup',
  py: 'py', pyi: 'py',
  go: 'go',
  rs: 'rust',
  c: 'c', h: 'c', cpp: 'c', cc: 'c', hpp: 'c', cs: 'c', java: 'c', kt: 'c', kts: 'c', swift: 'c', scala: 'c', dart: 'c', php: 'c',
  json: 'json', jsonc: 'json', json5: 'json',
  css: 'css', scss: 'css', sass: 'css', less: 'css',
  sh: 'shell', bash: 'shell', zsh: 'shell', env: 'shell', dockerfile: 'shell', makefile: 'shell', toml: 'yaml', ini: 'yaml',
  yml: 'yaml', yaml: 'yaml',
  sql: 'sql', prisma: 'c', graphql: 'c', gql: 'c',
  html: 'markup', htm: 'markup', xml: 'markup', svg: 'markup',
};

const LANG_NAMES: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript JSX', js: 'JavaScript', jsx: 'JavaScript JSX', mjs: 'JavaScript', cjs: 'JavaScript',
  py: 'Python', go: 'Go', rs: 'Rust', java: 'Java', kt: 'Kotlin', swift: 'Swift', c: 'C', cpp: 'C++', cs: 'C#', php: 'PHP',
  json: 'JSON', css: 'CSS', scss: 'SCSS', html: 'HTML', md: 'Markdown', mdx: 'MDX', yml: 'YAML', yaml: 'YAML', sql: 'SQL',
  sh: 'Shell', toml: 'TOML', prisma: 'Prisma', vue: 'Vue', svelte: 'Svelte', xml: 'XML', svg: 'SVG',
};

function ext(path: string) {
  const base = path.split('/').pop() || path;
  const lower = base.toLowerCase();
  if (lower === 'dockerfile' || lower === 'makefile') return lower;
  if (lower.startsWith('.env')) return 'env';
  const i = lower.lastIndexOf('.');
  return i === -1 ? '' : lower.slice(i + 1);
}

export function langFromPath(path?: string | null, hint?: string | null): Lang {
  const h = (hint || '').toLowerCase();
  if (h && EXT[h]) return EXT[h];
  if (h === 'typescript' || h === 'javascript') return 'js';
  if (h === 'python') return 'py';
  if (h === 'shell' || h === 'bash') return 'shell';
  if (!path) return 'plain';
  return EXT[ext(path)] || 'plain';
}

export function langLabel(path: string) {
  return LANG_NAMES[ext(path)] || (ext(path) ? ext(path).toUpperCase() : 'Text');
}

type State = { end: string; kind: 'com' | 'str' } | null;

const IDENT = /^[A-Za-z_$][\w$]*/;
const NUM = /^(?:0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?n?)/;

function push(out: Tok[], k: TokKind, t: string) {
  if (!t) return;
  const last = out[out.length - 1];
  if (last && last.k === k) last.t += t;
  else out.push({ k, t });
}

function findClose(line: string, from: number, delim: string) {
  for (let j = from; j < line.length; j++) {
    if (line[j] === '\\') {
      j++;
      continue;
    }
    if (line.startsWith(delim, j)) return j;
  }
  return -1;
}

function nextNonSpace(line: string, from: number) {
  for (let j = from; j < line.length; j++) if (line[j] !== ' ' && line[j] !== '\t') return line[j];
  return '';
}

function tokenizeCodeLine(line: string, spec: Spec, lang: Lang, state: State): { toks: Tok[]; state: State } {
  const out: Tok[] = [];
  let i = 0;

  if (state) {
    const close = state.kind === 'com' ? line.indexOf(state.end) : findClose(line, 0, state.end);
    if (close === -1) {
      push(out, state.kind, line);
      return { toks: out, state };
    }
    push(out, state.kind, line.slice(0, close + state.end.length));
    i = close + state.end.length;
    state = null;
  }

  if (lang === 'yaml') {
    const m = line.slice(i).match(/^(\s*-?\s*)([\w.\-/"']+)(\s*:)(?=\s|$)/);
    if (m) {
      push(out, 'plain', m[1]);
      push(out, 'key', m[2]);
      push(out, 'punct', m[3]);
      i += m[0].length;
    }
  }

  while (i < line.length) {
    const rest = line.slice(i);
    const ch = line[i];

    const lc = spec.line.find((p) => rest.startsWith(p));
    if (lc && !(lc === '#' && lang === 'shell' && i > 0 && /[\w$]/.test(line[i - 1]))) {
      push(out, 'com', rest);
      break;
    }
    const bc = spec.block.find(([open]) => rest.startsWith(open));
    if (bc) {
      const close = line.indexOf(bc[1], i + bc[0].length);
      if (close === -1) {
        push(out, 'com', rest);
        return { toks: out, state: { end: bc[1], kind: 'com' } };
      }
      push(out, 'com', line.slice(i, close + bc[1].length));
      i = close + bc[1].length;
      continue;
    }
    const q = spec.quotes.find((d) => rest.startsWith(d));
    if (q) {
      const close = findClose(line, i + q.length, q);
      if (close === -1) {
        push(out, 'str', rest);
        if (spec.multi.includes(q)) return { toks: out, state: { end: q, kind: 'str' } };
        break;
      }
      const text = line.slice(i, close + q.length);
      i = close + q.length;
      push(out, lang === 'json' && nextNonSpace(line, i) === ':' ? 'key' : 'str', text);
      continue;
    }
    const prev = i > 0 ? line[i - 1] : '';
    if (/\d/.test(ch) && !/[\w$]/.test(prev)) {
      const m = rest.match(NUM);
      if (m) {
        push(out, 'num', m[0]);
        i += m[0].length;
        continue;
      }
    }
    const id = rest.match(IDENT);
    if (id) {
      const w = id[0];
      const after = nextNonSpace(line, i + w.length);
      let k: TokKind = 'plain';
      const isKw = lang === 'sql' ? spec.kw.has(w.toLowerCase()) : spec.kw.has(w);
      if (isKw && prev !== '.') k = 'kw';
      else if (lang === 'css') k = after === ':' && prev !== ':' ? 'key' : 'plain';
      else if (after === '(') k = 'fn';
      else if (/^[A-Z]/.test(w) && lang !== 'sql') k = 'type';
      push(out, k, w);
      i += w.length;
      continue;
    }
    if (ch === '@' && /[A-Za-z]/.test(line[i + 1] || '')) {
      const m = rest.match(/^@[\w.]+/);
      if (m) {
        push(out, 'fn', m[0]);
        i += m[0].length;
        continue;
      }
    }
    push(out, /[{}()[\];,.<>=+\-*/%!&|^~?:]/.test(ch) ? 'punct' : 'plain', ch);
    i++;
  }
  return { toks: out, state };
}

function tokenizeMarkupLine(line: string, state: State): { toks: Tok[]; state: State } {
  const out: Tok[] = [];
  let i = 0;
  if (state) {
    const close = line.indexOf(state.end);
    if (close === -1) return { toks: [{ k: 'com', t: line }], state };
    push(out, 'com', line.slice(0, close + state.end.length));
    i = close + state.end.length;
    state = null;
  }
  let inTag = false;
  while (i < line.length) {
    const rest = line.slice(i);
    if (rest.startsWith('<!--')) {
      const close = line.indexOf('-->', i + 4);
      if (close === -1) {
        push(out, 'com', rest);
        return { toks: out, state: { end: '-->', kind: 'com' } };
      }
      push(out, 'com', line.slice(i, close + 3));
      i = close + 3;
      continue;
    }
    const tag = rest.match(/^<\/?[A-Za-z][\w:.-]*/);
    if (tag) {
      push(out, 'punct', tag[0].startsWith('</') ? '</' : '<');
      push(out, 'tag', tag[0].replace(/^<\/?/, ''));
      i += tag[0].length;
      inTag = true;
      continue;
    }
    if (inTag) {
      const attr = rest.match(/^[A-Za-z_:@#][\w:.-]*(?==)/);
      if (attr) {
        push(out, 'attr', attr[0]);
        i += attr[0].length;
        continue;
      }
      if (rest[0] === '"' || rest[0] === "'") {
        const close = line.indexOf(rest[0], i + 1);
        const end = close === -1 ? line.length : close + 1;
        push(out, 'str', line.slice(i, end));
        i = end;
        continue;
      }
      if (rest.startsWith('/>') || rest[0] === '>') {
        const t = rest.startsWith('/>') ? '/>' : '>';
        push(out, 'punct', t);
        i += t.length;
        inTag = false;
        continue;
      }
    }
    push(out, 'plain', line[i]);
    i++;
  }
  return { toks: out, state };
}

/** Max size we highlight; larger files render as plain text so the viewer stays fast. */
const MAX_CHARS = 400_000;
const MAX_LINE = 1_500;

export function tokenize(code: string, lang: Lang): Tok[][] {
  const lines = code.replace(/\r\n?/g, '\n').split('\n');
  if (lang === 'plain' || code.length > MAX_CHARS) return lines.map((l) => [{ k: 'plain', t: l }]);
  let state: State = null;
  return lines.map((l) => {
    if (l.length > MAX_LINE) return [{ k: 'plain', t: l }];
    const r = lang === 'markup' ? tokenizeMarkupLine(l, state) : tokenizeCodeLine(l, SPECS[lang], lang, state);
    state = r.state;
    return r.toks;
  });
}

/** Token colours on the light code surface. All meet WCAG AA on white and on the lime highlight. */
export const TOKEN_CLASS: Record<TokKind, string> = {
  plain: '',
  kw: 'text-[#9A3B12]',
  str: 'text-[#3F6212]',
  com: 'text-[#716D66] italic',
  num: 'text-[#8A5300]',
  fn: 'text-[#1F4E8C]',
  type: 'text-[#0B6464]',
  key: 'text-[#1F4E8C]',
  tag: 'text-[#9A3B12]',
  attr: 'text-[#8A5300]',
  punct: 'text-[#5E5B56]',
};
