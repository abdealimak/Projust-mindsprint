/**
 * In-memory stand-in for `@/lib/supabase/server` (tests only). Supports the query-builder
 * calls the brain uses: select/insert/update/upsert/delete, eq/neq/in, order, limit,
 * single/maybeSingle. Enabled by the alias loader when FAKE_SUPABASE=1.
 */
type Row = Record<string, unknown>;
export const tables: Record<string, Row[]> = {};
let idSeq = 0;

class Query {
  private filters: ((r: Row) => boolean)[] = [];
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: Row | Row[] | null = null;
  private orderBy: { col: string; asc: boolean } | null = null;
  private lim: number | null = null;
  private mode: 'many' | 'single' | 'maybe' = 'many';
  private conflict: string[] = [];
  private table: string;
  constructor(table: string) {
    this.table = table;
    tables[table] ??= [];
  }
  select() { return this; }
  insert(p: Row | Row[]) { this.op = 'insert'; this.payload = p; return this; }
  update(p: Row) { this.op = 'update'; this.payload = p; return this; }
  upsert(p: Row | Row[], o?: { onConflict?: string }) { this.op = 'upsert'; this.payload = p; this.conflict = (o?.onConflict || 'id').split(','); return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: unknown) { this.filters.push((r) => r[c] !== v); return this; }
  in(c: string, v: unknown[]) { this.filters.push((r) => v.includes(r[c])); return this; }
  order(col: string, o?: { ascending?: boolean }) { this.orderBy = { col, asc: o?.ascending !== false }; return this; }
  limit(n: number) { this.lim = n; return this; }
  textSearch() { return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }
  private run(): { data: unknown; error: null | { message: string } } {
    const t = tables[this.table];
    const match = (r: Row) => this.filters.every((f) => f(r));
    const stamp = (r: Row): Row => ({ id: r.id ?? `id${++idSeq}`, created_at: new Date().toISOString(), ...r });
    let rows: Row[] = [];
    if (this.op === 'insert') {
      rows = ([] as Row[]).concat(this.payload as Row).map(stamp);
      t.push(...rows);
    } else if (this.op === 'upsert') {
      for (const p of ([] as Row[]).concat(this.payload as Row)) {
        const ex = t.find((r) => this.conflict.every((c) => r[c] === p[c]));
        if (ex) { Object.assign(ex, p); rows.push(ex); } else { const n = stamp(p); t.push(n); rows.push(n); }
      }
    } else if (this.op === 'update') {
      rows = t.filter(match);
      rows.forEach((r) => Object.assign(r, this.payload));
    } else if (this.op === 'delete') {
      rows = t.filter(match);
      tables[this.table] = t.filter((r) => !match(r));
    } else {
      rows = t.filter(match);
      if (this.orderBy) {
        const { col, asc } = this.orderBy;
        rows = [...rows].sort((a, b) => ((a[col] as number) > (b[col] as number) ? 1 : -1) * (asc ? 1 : -1));
      }
      if (this.lim !== null) rows = rows.slice(0, this.lim);
    }
    const copy = JSON.parse(JSON.stringify(rows));
    if (this.mode === 'single') return copy[0] ? { data: copy[0], error: null } : { data: null, error: { message: 'no rows' } };
    if (this.mode === 'maybe') return { data: copy[0] ?? null, error: null };
    return { data: copy, error: null };
  }
  then<T>(res: (v: { data: unknown; error: null | { message: string } }) => T, rej?: (e: unknown) => T) {
    try { return Promise.resolve(res(this.run())); } catch (e) { return rej ? Promise.resolve(rej(e)) : Promise.reject(e); }
  }
}

export function createClient() {
  return { from: (t: string) => new Query(t) };
}
export async function getGithubToken() { return null; }
