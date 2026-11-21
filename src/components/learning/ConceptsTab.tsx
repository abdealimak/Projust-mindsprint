'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Network, List as ListIcon, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Misc';
import type { CodeRef, Concept, ConceptsResponse } from '@/types/learning';
import { api, usePoll, CodeRefChip, StateCard, ErrorNote, GenerationProgress, Spinner } from './shared';
import { loadErrorText } from './shared';

const MIN_COL_W = 224;
const MAX_COL_W = 300;
const NODE_W = 196;
const ROW_H = 84;
const PAD_X = 24;
const PAD_Y = 28;

const DIFFICULTY_LABEL: Record<Concept['difficulty'], string> = {
  intro: 'Intro',
  core: 'Core',
  advanced: 'Advanced',
};

interface Props {
  projectId: string;
  onOpenFile: (ref: CodeRef) => void;
  onChanged?: () => void;
}

export function ConceptsTab({ projectId, onOpenFile, onChanged }: Props) {
  const [data, setData] = useState<ConceptsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const statusRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<ConceptsResponse>(`/api/projects/${projectId}/concepts`);
      if (statusRef.current === 'generating' && res.status !== 'generating') onChanged?.();
      statusRef.current = res.status;
      setData(res);
      setLoadError(null);
    } catch (e) {
      setLoadError(loadErrorText(e, 'Could not load concepts.'));
    }
  }, [projectId, onChanged]);

  useEffect(() => {
    load();
  }, [load]);

  usePoll(load, data?.status === 'generating');

  const start = async (regenerate = false) => {
    setStarting(true);
    setActionError(null);
    try {
      const res = await api<ConceptsResponse>(`/api/projects/${projectId}/concepts`, {
        method: 'POST',
        json: { regenerate },
      });
      statusRef.current = res.status;
      setData(res);
      onChanged?.();
    } catch (e) {
      setActionError(e instanceof Error ? `${e.message} Try again in a moment.` : 'Could not start mapping.');
    } finally {
      setStarting(false);
    }
  };

  if (!data && loadError) {
    return (
      <StateCard
        tone="error"
        title="Concepts did not load."
        body={<p>{loadError}</p>}
        action={<Button onClick={load}>Try again</Button>}
      />
    );
  }

  if (!data) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading concepts">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[360px] w-full rounded-m" />
      </div>
    );
  }

  if (data.status === 'none') {
    return (
      <div className="space-y-3">
        {actionError && <ErrorNote message={actionError} />}
        <StateCard
          title="Map the ideas"
          em="your code is built on."
          body={
            <p>
              We read the repository and pull out each concept it relies on, how they depend on each other, and
              the exact lines where they show up. The course and quiz are built from this map.
            </p>
          }
          action={
            <Button variant="primary" size="lg" onClick={() => start(false)} disabled={starting}>
              {starting && <Spinner />}
              {starting ? 'Starting…' : 'Map the concepts'}
            </Button>
          }
        />
      </div>
    );
  }

  if (data.status === 'generating') {
    return <GenerationProgress label="Mapping concepts" progress={data.progress} detail={data.detail} />;
  }

  if (data.status === 'failed') {
    return (
      <div className="space-y-3">
        {actionError && <ErrorNote message={actionError} />}
        <StateCard
          tone="error"
          title="Mapping stopped."
          body={<p>{data.detail || 'Something went wrong while reading the code.'} Run it again; your files are still indexed.</p>}
          action={
            <Button variant="primary" onClick={() => start(true)} disabled={starting}>
              {starting && <Spinner />}
              Map again
            </Button>
          }
        />
      </div>
    );
  }

  if (data.concepts.length === 0) {
    return (
      <StateCard
        title="No concepts found."
        body={<p>The map came back empty. This happens with very small repositories. Map again after you push more code.</p>}
        action={
          <Button onClick={() => start(true)} disabled={starting}>
            Map again
          </Button>
        }
      />
    );
  }

  return (
    <ReadyConcepts
      concepts={data.concepts}
      onOpenFile={onOpenFile}
      onRegenerate={() => start(true)}
      regenerating={starting}
      error={actionError}
    />
  );
}

function ReadyConcepts({
  concepts,
  onOpenFile,
  onRegenerate,
  regenerating,
  error,
}: {
  concepts: Concept[];
  onOpenFile: (r: CodeRef) => void;
  onRegenerate: () => void;
  regenerating: boolean;
  error: string | null;
}) {
  const [view, setView] = useState<'graph' | 'list'>('graph');
  const sorted = useMemo(() => [...concepts].sort((a, b) => a.position - b.position), [concepts]);
  const [selectedId, setSelectedId] = useState<string>(sorted[0]?.id);
  const selected = sorted.find((c) => c.id === selectedId) || sorted[0];
  const categories = new Set(concepts.map((c) => c.category)).size;

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14.5px] text-muted">
          <span className="text-ink font-medium">{concepts.length} concepts</span> across {categories}{' '}
          {categories === 1 ? 'area' : 'areas'}. Pick one to see where it lives in your code.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex p-1 gap-0.5 rounded-full border border-line bg-sheet" role="group" aria-label="Concept view">
            {(
              [
                ['graph', 'Map', Network],
                ['list', 'List', ListIcon],
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  'h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-200 cursor-pointer',
                  view === v ? 'bg-olive text-[#F6F8EC]' : 'text-ink-2 hover:bg-paper'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="invisible" onClick={onRegenerate} disabled={regenerating} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Map again
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <div className="pj-card overflow-hidden min-w-0">
          {view === 'graph' ? (
            <ConceptGraph concepts={sorted} selectedId={selected?.id} onSelect={setSelectedId} />
          ) : (
            <ConceptList concepts={sorted} selectedId={selected?.id} onSelect={setSelectedId} />
          )}
        </div>
        {selected && <ConceptDetail concept={selected} all={sorted} onOpenFile={onOpenFile} onSelect={setSelectedId} />}
      </div>
    </div>
  );
}

/** Resolve depends_on entries (keys or ids) to concept ids. */
function useDeps(concepts: Concept[]) {
  return useMemo(() => {
    const byRef = new Map<string, string>();
    concepts.forEach((c) => {
      byRef.set(c.key, c.id);
      byRef.set(c.id, c.id);
    });
    const deps = new Map<string, string[]>();
    concepts.forEach((c) => {
      deps.set(
        c.id,
        c.depends_on.map((d) => byRef.get(d)).filter((d): d is string => !!d && d !== c.id)
      );
    });
    return deps;
  }, [concepts]);
}

function ConceptGraph({
  concepts,
  selectedId,
  onSelect,
}: {
  concepts: Concept[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const deps = useDeps(concepts);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAvail(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => {
    // Depth = longest dependency chain (cycle-safe).
    const depth = new Map<string, number>();
    const visiting = new Set<string>();
    const getDepth = (id: string): number => {
      if (depth.has(id)) return depth.get(id)!;
      if (visiting.has(id)) return 0;
      visiting.add(id);
      const ds = deps.get(id) || [];
      const d = ds.length ? Math.max(...ds.map(getDepth)) + 1 : 0;
      visiting.delete(id);
      depth.set(id, d);
      return d;
    };
    concepts.forEach((c) => getDepth(c.id));

    const cols: Concept[][] = [];
    concepts.forEach((c) => {
      const d = depth.get(c.id) || 0;
      (cols[d] ||= []).push(c);
    });

    // Order each column by the average row of its dependencies to reduce crossings.
    const row = new Map<string, number>();
    cols.forEach((col, ci) => {
      if (ci > 0) {
        const score = (c: Concept) => {
          const ds = (deps.get(c.id) || []).map((d) => row.get(d)).filter((r): r is number => r !== undefined);
          return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : c.position;
        };
        col.sort((a, b) => score(a) - score(b));
      }
      col.forEach((c, i) => row.set(c.id, i));
    });

    const maxRows = Math.max(...cols.map((c) => c.length));
    const height = PAD_Y * 2 + maxRows * ROW_H;
    const fit = cols.length > 1 ? (avail - PAD_X * 2 - NODE_W) / (cols.length - 1) : MIN_COL_W;
    const COL_W = Math.min(MAX_COL_W, Math.max(MIN_COL_W, fit));
    const width = PAD_X * 2 + (cols.length - 1) * COL_W + NODE_W;
    const pos = new Map<string, { x: number; y: number }>();
    cols.forEach((col, ci) => {
      const offset = ((maxRows - col.length) * ROW_H) / 2;
      col.forEach((c, ri) => {
        pos.set(c.id, { x: PAD_X + ci * COL_W, y: PAD_Y + offset + ri * ROW_H + ROW_H / 2 });
      });
    });
    const dependents = new Map<string, number>();
    deps.forEach((ds) => ds.forEach((d) => dependents.set(d, (dependents.get(d) || 0) + 1)));
    return { pos, width, height, depth, dependents };
  }, [concepts, deps, avail]);

  const edges: { from: string; to: string; d: string }[] = [];
  concepts.forEach((c) => {
    const to = layout.pos.get(c.id)!;
    (deps.get(c.id) || []).forEach((dep) => {
      const from = layout.pos.get(dep);
      if (!from) return;
      const x1 = from.x + NODE_W;
      const y1 = from.y;
      const x2 = to.x;
      const y2 = to.y;
      const mx = (x1 + x2) / 2;
      edges.push({ from: dep, to: c.id, d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}` });
    });
  });

  return (
    <div ref={wrapRef} className="overflow-x-auto bg-paper-2">
      <div className="relative" style={{ width: layout.width, height: layout.height, minWidth: '100%' }}>
        <svg className="absolute inset-0" width={layout.width} height={layout.height} aria-hidden="true">
          {edges.map((e) => {
            const active = e.from === selectedId || e.to === selectedId;
            return (
              <path
                key={`${e.from}-${e.to}`}
                d={e.d}
                fill="none"
                stroke={active ? '#7A766F' : '#D6D1C7'}
                strokeWidth={active ? 1.6 : 1.2}
                className="transition-[stroke] duration-200"
              />
            );
          })}
        </svg>
        {concepts.map((c) => {
          const p = layout.pos.get(c.id)!;
          const isRoot = (layout.depth.get(c.id) || 0) === 0 && (layout.dependents.get(c.id) || 0) > 0;
          const isSel = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              aria-pressed={isSel}
              className={cn(
                'absolute -translate-y-1/2 text-left rounded-[12px] border px-3 py-2 cursor-pointer',
                'shadow-[0_6px_16px_-8px_rgba(0,0,0,.2)] transition-[transform,box-shadow] duration-200 ease-land hover:-translate-y-[calc(50%+2px)]',
                isRoot ? 'bg-ink text-paper border-ink' : 'bg-sheet text-ink border-line',
                isSel && 'ring-2 ring-lime ring-offset-2 ring-offset-paper-2'
              )}
              style={{ left: p.x, top: p.y, width: NODE_W }}
            >
              <span className="block text-[13px] font-medium leading-tight line-clamp-2" title={c.name}>{c.name}</span>
              <span className={cn('block font-mono text-[10px] mt-0.5 truncate', isRoot ? 'text-[#A8A39A]' : 'text-muted')}>
                {c.category}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConceptList({
  concepts,
  selectedId,
  onSelect,
}: {
  concepts: Concept[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const m = new Map<string, Concept[]>();
    concepts.forEach((c) => {
      if (!m.has(c.category)) m.set(c.category, []);
      m.get(c.category)!.push(c);
    });
    return Array.from(m.entries());
  }, [concepts]);

  return (
    <div className="divide-y divide-line">
      {groups.map(([cat, items]) => (
        <section key={cat} className="px-5 py-4">
          <h4 className="text-[13px] font-medium text-muted mb-2">{cat}</h4>
          <ul className="space-y-1">
            {items.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  aria-pressed={c.id === selectedId}
                  className={cn(
                    'w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 rounded-[12px] border transition-colors duration-200 cursor-pointer',
                    c.id === selectedId ? 'border-ink bg-paper' : 'border-transparent hover:bg-paper'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-medium truncate">{c.name}</span>
                    <span className="block text-[13px] text-muted truncate">{c.description}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-muted">{DIFFICULTY_LABEL[c.difficulty]}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ConceptDetail({
  concept,
  all,
  onOpenFile,
  onSelect,
}: {
  concept: Concept;
  all: Concept[];
  onOpenFile: (r: CodeRef) => void;
  onSelect: (id: string) => void;
}) {
  const byRef = new Map<string, Concept>();
  all.forEach((c) => {
    byRef.set(c.key, c);
    byRef.set(c.id, c);
  });
  const needs = concept.depends_on.map((d) => byRef.get(d)).filter((c): c is Concept => !!c);
  const usedBy = all.filter((c) => c.depends_on.includes(concept.key) || c.depends_on.includes(concept.id));

  return (
    <aside className="pj-card p-5 2xl:sticky 2xl:top-6" aria-live="polite">
      <div className="flex items-center gap-2 text-[12.5px] text-muted">
        <span>{concept.category}</span>
        <span aria-hidden="true" className="w-1 h-1 rounded-full bg-line-2" />
        <span>{DIFFICULTY_LABEL[concept.difficulty]}</span>
      </div>
      <h3 className="font-serif text-[30px] leading-[1.05] mt-2">{concept.name}</h3>
      <p className="mt-3 text-[15px] leading-[1.6] text-ink-2">{concept.description}</p>

      <div className="mt-5">
        <h4 className="text-[13px] font-medium text-muted mb-2">Where it shows up</h4>
        {concept.files.length === 0 ? (
          <p className="text-[14px] text-muted">No specific lines linked.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {concept.files.map((f, i) => (
              <CodeRefChip key={`${f.path}-${i}`} codeRef={f} onOpen={onOpenFile} />
            ))}
          </div>
        )}
      </div>

      {(needs.length > 0 || usedBy.length > 0) && (
        <div className="mt-5 pt-4 border-t border-line grid grid-cols-2 gap-4 text-[13.5px]">
          <RelList label="Builds on" items={needs} onSelect={onSelect} />
          <RelList label="Leads to" items={usedBy} onSelect={onSelect} />
        </div>
      )}
    </aside>
  );
}

function RelList({ label, items, onSelect }: { label: string; items: Concept[]; onSelect: (id: string) => void }) {
  return (
    <div className="min-w-0">
      <h4 className="text-[13px] font-medium text-muted mb-1.5">{label}</h4>
      {items.length === 0 ? (
        <span className="text-muted">Nothing</span>
      ) : (
        <ul className="space-y-1">
          {items.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onSelect(c.id)} className="text-left underline-offset-2 hover:underline cursor-pointer truncate max-w-full">
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
