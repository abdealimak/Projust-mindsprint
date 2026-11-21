'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Network, List as ListIcon, RefreshCw, MessageSquare, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Misc';
import type { CodeRef, Concept, ConceptsResponse } from '@/types/learning';
import { api, usePoll, CodeRefChip, CodeBlock, StateCard, ErrorNote, GenerationProgress, Spinner } from './shared';
import { loadErrorText } from './shared';

/* Graph geometry (px). Nodes have a fixed size so nothing overlaps or gets clipped. */
const NODE_W = 216;
const NODE_H = 64;
const GAP_X = 20;
const GAP_Y = 14;
const LEVEL_GAP = 44;
const LABEL_H = 30;
const PAD_X = 20;
const PAD_TOP = 16;
const RAIL_W = 22;

const DIFFICULTY_LABEL: Record<Concept['difficulty'], string> = {
  intro: 'Intro',
  core: 'Core',
  advanced: 'Advanced',
};

/** One colour per area. Warm, distinct, no violet. Text never sits on these. */
const AREA_COLORS = ['#B5D334', '#7FB8FF', '#FF9F6E', '#5CCB9A', '#E2B93B', '#C9A27E', '#8FA748', '#9AA3AE'];

type SourceFile = { path: string; content: string; language?: string };

interface Props {
  projectId: string;
  onOpenFile: (ref: CodeRef) => void;
  onChanged?: () => void;
  /** Indexed files, used to preview the lines a concept points at. */
  files?: SourceFile[];
  /** Pre-fills the tutor with a question about the selected concept. */
  onAsk?: (question: string) => void;
}

export function ConceptsTab({ projectId, onOpenFile, onChanged, files, onAsk }: Props) {
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
      <div className="space-y-4" aria-busy="true" aria-label="Loading concepts">
        <div className="flex justify-between gap-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-9 w-40 rounded-full" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <Skeleton className="h-[420px] w-full rounded-m" />
          <Skeleton className="h-[420px] w-full rounded-m hidden xl:block" />
        </div>
      </div>
    );
  }

  if (data.status === 'none') {
    return (
      <div className="space-y-3">
        {actionError && <ErrorNote message={actionError} />}
        <StateCard
          icon={<Network className="w-5 h-5" />}
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
    return (
      <GenerationProgress
        label="Mapping concepts"
        progress={data.progress}
        detail={data.detail}
        steps={['Reading the files', 'Finding the concepts', 'Linking them to lines']}
      />
    );
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
      files={files}
      onAsk={onAsk}
    />
  );
}

/* ------------------------------------------------------------------ helpers */

/** Resolve depends_on entries (keys or ids) to concept ids. */
function useDeps(concepts: Concept[]) {
  return useMemo(() => {
    const byRef = new Map<string, string>();
    concepts.forEach((c) => {
      byRef.set(c.key, c.id);
      byRef.set(c.id, c.id);
    });
    const deps = new Map<string, string[]>();
    const usedBy = new Map<string, string[]>();
    concepts.forEach((c) => {
      const ds = Array.from(new Set(c.depends_on.map((d) => byRef.get(d)).filter((d): d is string => !!d && d !== c.id)));
      deps.set(c.id, ds);
      ds.forEach((d) => usedBy.set(d, [...(usedBy.get(d) || []), c.id]));
    });
    return { deps, usedBy };
  }, [concepts]);
}

function useAreas(concepts: Concept[]) {
  return useMemo(() => {
    const names: string[] = [];
    concepts.forEach((c) => {
      if (!names.includes(c.category)) names.push(c.category);
    });
    const color = new Map(names.map((n, i) => [n, AREA_COLORS[i % AREA_COLORS.length]]));
    return { names, color };
  }, [concepts]);
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/* --------------------------------------------------------------- ready view */

function ReadyConcepts({
  concepts,
  onOpenFile,
  onRegenerate,
  regenerating,
  error,
  files,
  onAsk,
}: {
  concepts: Concept[];
  onOpenFile: (r: CodeRef) => void;
  onRegenerate: () => void;
  regenerating: boolean;
  error: string | null;
  files?: SourceFile[];
  onAsk?: (q: string) => void;
}) {
  const [view, setView] = useState<'graph' | 'list'>('graph');
  const sorted = useMemo(() => [...concepts].sort((a, b) => a.position - b.position), [concepts]);
  const [selectedId, setSelectedId] = useState<string>(sorted[0]?.id);
  const [area, setArea] = useState<string | null>(null);
  const selected = sorted.find((c) => c.id === selectedId) || sorted[0];
  const areas = useAreas(sorted);
  const rel = useDeps(sorted);
  const detailRef = useRef<HTMLDivElement>(null);

  // Phones get the list first; the map is still one tap away.
  useEffect(() => {
    if (window.matchMedia('(max-width: 639px)').matches) setView('list');
  }, []);

  const select = (id: string) => {
    setSelectedId(id);
    if (!window.matchMedia('(min-width: 1280px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorNote message={error} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-muted max-w-[60ch]">
          <span className="text-ink font-medium">
            {concepts.length} concepts in {areas.names.length} {areas.names.length === 1 ? 'area' : 'areas'}.
          </span>{' '}
          Read it top to bottom: arrows point from an idea to the ideas that build on it. Pick one to see where it lives in your code.
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
                  'h-8 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-200 cursor-pointer',
                  view === v ? 'bg-olive text-[#F6F8EC] shadow-pill' : 'text-ink-2 hover:bg-paper'
                )}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="invisible" onClick={onRegenerate} disabled={regenerating} icon={regenerating ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}>
            Map again
          </Button>
        </div>
      </div>

      {/* Area legend doubles as a filter */}
      {areas.names.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Highlight an area">
          <span className="text-[13px] text-muted mr-1">Areas</span>
          {areas.names.map((n) => {
            const count = sorted.filter((c) => c.category === n).length;
            const on = area === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                onClick={() => setArea(on ? null : n)}
                className={cn(
                  'inline-flex items-center gap-2 h-8 pl-2.5 pr-3 rounded-full border text-[13px] transition-colors duration-150 cursor-pointer',
                  on ? 'border-ink bg-ink text-paper' : 'border-line bg-sheet text-ink-2 hover:border-line-2',
                  area && !on && 'opacity-60'
                )}
              >
                <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full" style={{ background: areas.color.get(n) }} />
                {n}
                <span className={cn('tabular-nums text-[12px]', on ? 'text-[#C9C5BC]' : 'text-muted')}>{count}</span>
              </button>
            );
          })}
          {area && (
            <button type="button" onClick={() => setArea(null)} className="h-8 px-2.5 text-[13px] text-muted hover:text-ink underline-offset-2 hover:underline cursor-pointer">
              Show all
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="pj-card overflow-hidden min-w-0">
          {view === 'graph' ? (
            <ConceptGraph concepts={sorted} rel={rel} areas={areas} area={area} selectedId={selected?.id} onSelect={select} />
          ) : (
            <ConceptList concepts={sorted} rel={rel} areas={areas} area={area} selectedId={selected?.id} onSelect={select} />
          )}
        </div>
        {selected && (
          <div ref={detailRef} className="xl:sticky xl:top-6 scroll-mt-4">
            <ConceptDetail
              concept={selected}
              all={sorted}
              rel={rel}
              color={areas.color.get(selected.category)}
              onOpenFile={onOpenFile}
              onSelect={select}
              files={files}
              onAsk={onAsk}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- graph */

type Rel = ReturnType<typeof useDeps>;
type Areas = ReturnType<typeof useAreas>;

function ConceptGraph({
  concepts,
  rel,
  areas,
  area,
  selectedId,
  onSelect,
}: {
  concepts: Concept[];
  rel: Rel;
  areas: Areas;
  area: string | null;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const { deps, usedBy } = rel;
  const [wrapRef, avail] = useWidth<HTMLDivElement>();
  const [hoverId, setHoverId] = useState<string | null>(null);

  /*
   * Layered, top-down layout. Each level holds the concepts whose longest dependency chain has
   * the same length, so everything a concept builds on sits above it. A level wraps onto more
   * rows when it is wider than the card, so nodes never overlap, never get clipped and the map
   * never needs sideways scrolling, down to phone widths.
   */
  const layout = useMemo(() => {
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

    const levels: Concept[][] = [];
    concepts.forEach((c) => (levels[depth.get(c.id) || 0] ||= []).push(c));

    const inner = Math.max(160, (avail || 760) - PAD_X * 2);
    let perRow = Math.max(1, Math.floor((inner + GAP_X) / (Math.min(NODE_W, inner) + GAP_X)));
    // One node per row (phones): nodes take the full width and edges run down a rail on the left.
    const rail = perRow === 1 ? RAIL_W : 0;
    const nodeW = perRow === 1 ? inner - rail : Math.min(NODE_W, inner);
    perRow = Math.max(1, perRow);
    const width = inner + PAD_X * 2;
    const areaIdx = (c: Concept) => areas.names.indexOf(c.category);

    const pos = new Map<string, { x: number; y: number }>();
    const labels: { y: number; text: string }[] = [];
    let y = PAD_TOP;
    levels.forEach((lv, li) => {
      if (!lv) return;
      // Same-area concepts sit together; later levels follow the average x of what they build on.
      const bary = (c: Concept) => {
        const xs = (deps.get(c.id) || []).map((d) => pos.get(d)?.x).filter((x): x is number => x !== undefined);
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Infinity;
      };
      lv.sort((a, b) =>
        li === 0
          ? areaIdx(a) - areaIdx(b) || a.position - b.position
          : bary(a) - bary(b) || areaIdx(a) - areaIdx(b) || a.position - b.position
      );
      labels.push({ y, text: li === 0 ? 'Start here' : li === levels.length - 1 ? 'Builds on everything above' : 'Builds on the ideas above' });
      y += LABEL_H;
      for (let r = 0; r < lv.length; r += perRow) {
        const row = lv.slice(r, r + perRow);
        const rowW = row.length * nodeW + (row.length - 1) * GAP_X;
        const x0 = rail ? PAD_X + rail : PAD_X + Math.max(0, (inner - rowW) / 2);
        row.forEach((c, i) => pos.set(c.id, { x: x0 + i * (nodeW + GAP_X), y }));
        y += NODE_H + GAP_Y;
      }
      y += LEVEL_GAP - GAP_Y;
    });
    const height = y - LEVEL_GAP + GAP_Y + PAD_TOP;
    return { pos, width, height, labels, nodeW, rail };
  }, [concepts, deps, areas.names, avail]);

  // Edges of the selected (or hovered) concept are inked; hovering also fades the rest.
  const focusId = hoverId || selectedId;
  const related = useMemo(() => {
    const s = new Set<string>();
    if (!hoverId) return s;
    s.add(hoverId);
    (deps.get(hoverId) || []).forEach((d) => s.add(d));
    (usedBy.get(hoverId) || []).forEach((d) => s.add(d));
    return s;
  }, [hoverId, deps, usedBy]);

  const W = layout.nodeW;
  const edges: { from: string; to: string; d: string }[] = [];
  concepts.forEach((c) => {
    const to = layout.pos.get(c.id);
    if (!to) return;
    (deps.get(c.id) || []).forEach((dep) => {
      const from = layout.pos.get(dep);
      if (!from) return;
      let d: string;
      if (layout.rail) {
        const x = from.x;
        const y1 = from.y + NODE_H / 2;
        const y2 = to.y + NODE_H / 2;
        const out = 8 + (edges.length % 3) * 4;
        d = `M${x},${y1} C${x - out},${y1} ${x - out},${y1} ${x - out},${y1 + 10} L${x - out},${y2 - 10} C${x - out},${y2} ${x - out},${y2} ${x - 4},${y2}`;
      } else if (to.y > from.y) {
        const x1 = from.x + W / 2;
        const y1 = from.y + NODE_H;
        const x2 = to.x + W / 2;
        const y2 = to.y - 5;
        const k = Math.max(22, (y2 - y1) / 2);
        d = `M${x1},${y1} C${x1},${y1 + k} ${x2},${y2 - k} ${x2},${y2}`;
      } else {
        // Same row (dependency cycle): loop out to the right.
        const x = from.x + W;
        const y1 = from.y + NODE_H / 2;
        const y2 = to.y + NODE_H / 2;
        d = `M${x},${y1} C${x + 36},${y1} ${x + 36},${y2 + 24} ${to.x + W + 4},${y2}`;
      }
      edges.push({ from: dep, to: c.id, d });
    });
  });

  return (
    <div ref={wrapRef} className="relative bg-paper-2 overflow-hidden">
      <div className="relative" style={{ width: layout.width, height: layout.height, maxWidth: '100%' }}>
        {layout.labels.map((l, i) => (
          <div
            key={i}
            aria-hidden="true"
            className={cn('absolute left-0 right-0 flex items-center gap-3 px-5 text-[12px] text-muted', i > 0 && 'border-t border-line')}
            style={{ top: l.y - (i > 0 ? LEVEL_GAP / 2 - 4 : 0), height: LABEL_H + (i > 0 ? LEVEL_GAP / 2 - 4 : 0), paddingTop: i > 0 ? LEVEL_GAP / 2 - 4 : 0, paddingLeft: PAD_X + layout.rail }}
          >
            <span className="tabular-nums">{i + 1}.</span>
            {l.text}
          </div>
        ))}

        <svg className="absolute inset-0 pointer-events-none" width={layout.width} height={layout.height} aria-hidden="true">
          <defs>
            <marker id="pj-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="#B4AEA3" />
            </marker>
            <marker id="pj-arrow-on" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" fill="#111110" />
            </marker>
          </defs>
          {edges.map((e) => {
            const on = !!focusId && (e.from === focusId || e.to === focusId);
            const dim = (!!hoverId && !on) || (!!area && !concepts.some((c) => c.category === area && (c.id === e.from || c.id === e.to)));
            return (
              <path
                key={`${e.from}-${e.to}`}
                d={e.d}
                fill="none"
                stroke={on ? '#111110' : '#BDB7AC'}
                strokeWidth={on ? 1.75 : 1.25}
                markerEnd={`url(#${on ? 'pj-arrow-on' : 'pj-arrow'})`}
                opacity={dim ? 0.3 : 1}
                className="transition-[stroke,opacity] duration-200"
              />
            );
          })}
        </svg>

        {concepts.map((c) => {
          const p = layout.pos.get(c.id);
          if (!p) return null;
          const isSel = c.id === selectedId;
          const dim = (!!hoverId && !related.has(c.id)) || (!!area && c.category !== area);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              onMouseEnter={() => setHoverId(c.id)}
              onMouseLeave={() => setHoverId(null)}
              onFocus={() => setHoverId(c.id)}
              onBlur={() => setHoverId(null)}
              aria-pressed={isSel}
              aria-label={`${c.name}. ${c.category}, ${DIFFICULTY_LABEL[c.difficulty]}.`}
              className={cn(
                'absolute text-left rounded-[12px] border bg-sheet pl-4 pr-3 py-2 cursor-pointer overflow-hidden flex flex-col justify-center',
                'transition-[transform,box-shadow,opacity,border-color] duration-200 ease-land hover:-translate-y-0.5',
                isSel
                  ? 'border-ink shadow-[0_0_0_3px_#CDEB5A,0_10px_24px_-12px_rgba(0,0,0,.35)]'
                  : 'border-line shadow-[0_6px_16px_-10px_rgba(0,0,0,.25)] hover:border-line-2',
                dim && !isSel && 'opacity-45'
              )}
              style={{ left: p.x, top: p.y, width: W, height: NODE_H }}
            >
              <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ background: areas.color.get(c.category) }} />
              <span className="block text-[13.5px] font-medium leading-[1.25] text-ink line-clamp-2" title={c.name}>
                {c.name}
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted leading-none whitespace-nowrap">
                <span className="truncate">{c.category}</span>
                <span aria-hidden="true" className="w-[3px] h-[3px] rounded-full bg-line-2 shrink-0" />
                <DifficultyDots d={c.difficulty} />
                {DIFFICULTY_LABEL[c.difficulty]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DifficultyDots({ d }: { d: Concept['difficulty'] }) {
  const n = d === 'intro' ? 1 : d === 'core' ? 2 : 3;
  return (
    <span aria-hidden="true" className="inline-flex gap-[2px]">
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn('w-[5px] h-[5px] rounded-full', i < n ? 'bg-ink-2' : 'bg-line-2')} />
      ))}
    </span>
  );
}

/* --------------------------------------------------------------------- list */

function ConceptList({
  concepts,
  rel,
  areas,
  area,
  selectedId,
  onSelect,
}: {
  concepts: Concept[];
  rel: Rel;
  areas: Areas;
  area: string | null;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const groups = areas.names
    .filter((n) => !area || n === area)
    .map((n) => [n, concepts.filter((c) => c.category === n)] as const);

  return (
    <div className="divide-y divide-line">
      {groups.map(([cat, items]) => (
        <section key={cat} className="px-3 sm:px-4 py-4">
          <h4 className="flex items-center gap-2 px-2 mb-2 text-[13px] font-medium text-ink-2">
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full" style={{ background: areas.color.get(cat) }} />
            {cat}
            <span className="text-muted font-normal tabular-nums">{items.length}</span>
          </h4>
          <ul className="space-y-1">
            {items.map((c) => {
              const needs = (rel.deps.get(c.id) || []).length;
              const on = c.id === selectedId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    aria-pressed={on}
                    className={cn(
                      'w-full text-left flex items-start justify-between gap-3 px-3 py-3 rounded-[12px] border transition-colors duration-200 cursor-pointer',
                      on ? 'border-ink bg-sheet shadow-[0_0_0_3px_#CDEB5A]' : 'border-transparent hover:bg-paper'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium leading-snug">{c.name}</span>
                      <span className="block text-[13.5px] text-muted mt-0.5 line-clamp-2">{c.description}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <DifficultyDots d={c.difficulty} />
                          {DIFFICULTY_LABEL[c.difficulty]}
                        </span>
                        {needs > 0 && <span>Builds on {needs}</span>}
                        {c.files.length > 0 && <span className="font-mono">{c.files.length === 1 ? '1 place in code' : `${c.files.length} places in code`}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- detail */

function ConceptDetail({
  concept,
  all,
  rel,
  color,
  onOpenFile,
  onSelect,
  files,
  onAsk,
}: {
  concept: Concept;
  all: Concept[];
  rel: Rel;
  color?: string;
  onOpenFile: (r: CodeRef) => void;
  onSelect: (id: string) => void;
  files?: SourceFile[];
  onAsk?: (q: string) => void;
}) {
  const byId = new Map(all.map((c) => [c.id, c]));
  const needs = (rel.deps.get(concept.id) || []).map((id) => byId.get(id)).filter((c): c is Concept => !!c);
  const usedBy = (rel.usedBy.get(concept.id) || []).map((id) => byId.get(id)).filter((c): c is Concept => !!c);
  const idx = all.findIndex((c) => c.id === concept.id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;

  const [refIdx, setRefIdx] = useState(0);
  useEffect(() => setRefIdx(0), [concept.id]);
  const ref = concept.files[refIdx];
  const file = ref && files?.find((f) => f.path === ref.path);
  const MAX_PREVIEW = 16;
  const preview = useMemo(() => {
    if (!ref || !file) return null;
    const lines = file.content.split('\n');
    const end = Math.min(ref.endLine, ref.startLine + MAX_PREVIEW - 1, lines.length);
    if (ref.startLine > lines.length) return null;
    return { snippet: lines.slice(ref.startLine - 1, end).join('\n'), cut: ref.endLine > end };
  }, [ref, file]);

  return (
    <aside className="pj-card overflow-hidden" aria-live="polite" aria-label="Selected concept">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-2">
          <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-line bg-paper-2">
            <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: color }} />
            {concept.category}
          </span>
          <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-line">
            <DifficultyDots d={concept.difficulty} />
            {DIFFICULTY_LABEL[concept.difficulty]}
          </span>
          <span className="ml-auto text-muted tabular-nums">
            {idx + 1} of {all.length}
          </span>
        </div>
        <h3 className="font-serif text-[28px] sm:text-[30px] leading-[1.08] tracking-[-0.01em] mt-3">{concept.name}</h3>
        <p className="mt-3 text-[15px] leading-[1.6] text-ink-2">{concept.description}</p>

        <div className="mt-5">
          <h4 className="text-[13px] font-medium text-muted mb-2">Where it shows up</h4>
          {concept.files.length === 0 ? (
            <p className="text-[14px] text-muted">No specific lines linked.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {concept.files.map((f, i) => (
                <CodeRefChip
                  key={`${f.path}-${i}`}
                  codeRef={f}
                  active={files ? i === refIdx : undefined}
                  onOpen={files && i !== refIdx ? () => setRefIdx(i) : onOpenFile}
                />
              ))}
            </div>
          )}
        </div>

        {preview && ref && (
          <div className="mt-3">
            <CodeBlock snippet={preview.snippet} startLine={ref.startLine} codeRef={ref} onOpen={onOpenFile} />
            {preview.cut && (
              <p className="mt-1.5 text-[12.5px] text-muted">
                First {MAX_PREVIEW} lines shown. Open the file to read all of it.
              </p>
            )}
          </div>
        )}
      </div>

      {(needs.length > 0 || usedBy.length > 0) && (
        <div className="px-5 sm:px-6 py-4 border-t border-line grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
          <RelList label="Builds on" empty="Nothing. A starting point." items={needs} onSelect={onSelect} />
          <RelList label="Leads to" empty="Nothing builds on it yet." items={usedBy} onSelect={onSelect} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 px-5 sm:px-6 py-3 border-t border-line bg-paper-2">
        {onAsk && (
          <Button
            size="sm"
            onClick={() => onAsk(`Explain "${concept.name}" in my code. Where does it happen and why is it written this way?`)}
            icon={<MessageSquare className="w-3.5 h-3.5" />}
          >
            Ask the tutor
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            disabled={!prev}
            onClick={() => prev && onSelect(prev.id)}
            aria-label={prev ? `Previous concept: ${prev.name}` : 'No previous concept'}
            className="w-8 h-8 grid place-items-center rounded-full text-ink-2 hover:bg-sheet disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && onSelect(next.id)}
            aria-label={next ? `Next concept: ${next.name}` : 'No next concept'}
            className="w-8 h-8 grid place-items-center rounded-full text-ink-2 hover:bg-sheet disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function RelList({
  label,
  empty,
  items,
  onSelect,
}: {
  label: string;
  empty: string;
  items: Concept[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="min-w-0">
      <h4 className="text-[13px] font-medium text-muted mb-1.5">{label}</h4>
      {items.length === 0 ? (
        <p className="text-[13.5px] text-muted">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className="w-full text-left text-[13.5px] leading-snug px-2.5 py-1.5 -mx-2.5 rounded-[8px] hover:bg-paper cursor-pointer"
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
