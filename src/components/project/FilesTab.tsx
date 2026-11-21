'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, FileCode, FileText, Folder, FolderOpen, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CodeViewer } from './CodeViewer';

interface FileRecord {
  path: string;
  language: string;
  size_bytes: number;
  line_count: number;
  content: string;
}

interface FilesTabProps {
  files: FileRecord[];
  initialFilePath?: string | null;
  initialLines?: [number, number] | null;
}

type DirNode = { kind: 'dir'; name: string; path: string; children: TreeNode[]; count: number };
type FileNode = { kind: 'file'; name: string; path: string; file: FileRecord };
type TreeNode = DirNode | FileNode;

function buildTree(files: FileRecord[]): DirNode {
  const root: DirNode = { kind: 'dir', name: '', path: '', children: [], count: 0 };
  for (const f of files) {
    const parts = f.path.split('/');
    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts.slice(0, i + 1).join('/');
      let next = dir.children.find((c): c is DirNode => c.kind === 'dir' && c.path === p);
      if (!next) {
        next = { kind: 'dir', name: parts[i], path: p, children: [], count: 0 };
        dir.children.push(next);
      }
      dir = next;
    }
    dir.children.push({ kind: 'file', name: parts[parts.length - 1], path: f.path, file: f });
  }
  const finish = (d: DirNode): DirNode => {
    d.children = d.children.map((c) => (c.kind === 'dir' ? finish(c) : c));
    d.children.sort((a, b) => (a.kind !== b.kind ? (a.kind === 'dir' ? -1 : 1) : a.name.localeCompare(b.name)));
    d.count = d.children.reduce((n, c) => n + (c.kind === 'dir' ? c.count : 1), 0);
    // Fold single-folder chains ("src/lib") into one row.
    if (d.path && d.children.length === 1 && d.children[0].kind === 'dir') {
      const only = d.children[0];
      return { ...only, name: `${d.name}/${only.name}` };
    }
    return d;
  };
  root.children = root.children.map((c) => (c.kind === 'dir' ? finish(c) : c));
  root.children.sort((a, b) => (a.kind !== b.kind ? (a.kind === 'dir' ? -1 : 1) : a.name.localeCompare(b.name)));
  root.count = files.length;
  return root;
}

function ancestors(path: string) {
  const parts = path.split('/');
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
}

function isCodeFile(path: string) {
  return !/\.(md|mdx|txt|rst|lock)$/i.test(path) && !/(^|\/)(license|readme)/i.test(path);
}

function allDirs(n: DirNode, out: string[] = []) {
  n.children.forEach((c) => {
    if (c.kind === 'dir') {
      out.push(c.path);
      allDirs(c, out);
    }
  });
  return out;
}

export function FilesTab({ files, initialFilePath, initialLines }: FilesTabProps) {
  const [search, setSearch] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(
    initialFilePath || (files.length > 0 ? files[0].path : null)
  );
  const [highlightRange, setHighlightRange] = useState<[number, number] | null>(initialLines || null);
  const tree = useMemo(() => buildTree(files), [files]);
  const [open, setOpen] = useState<Set<string>>(() => {
    const s = new Set<string>(files.length <= 80 ? allDirs(buildTree(files)) : []);
    if (initialFilePath) ancestors(initialFilePath).forEach((a) => s.add(a));
    return s;
  });
  const listRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const selectedFile = files.find((f) => f.path === selectedPath);
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => (q ? files.filter((f) => f.path.toLowerCase().includes(q)) : []), [files, q]);

  // Bring the selected file into view in the list (e.g. when opened from a citation).
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedPath]);

  const choose = (path: string) => {
    setSelectedPath(path);
    setHighlightRange(null);
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches) {
      requestAnimationFrame(() => viewerRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    }
  };

  const toggle = (path: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });

  if (files.length === 0) {
    return (
      <div className="pj-card px-6 py-14 text-center">
        <h3 className="pj-display text-[clamp(28px,3vw,36px)]">No files indexed.</h3>
        <p className="mt-3 text-[15px] text-muted max-w-[52ch] mx-auto">
          We found no source files we could read in this repository. Re-sync after pushing code, or check that the
          repository is not empty.
        </p>
      </div>
    );
  }

  const renderNode = (n: TreeNode, depth: number): React.ReactNode => {
    const pad = { paddingLeft: `${10 + depth * 14}px` };
    if (n.kind === 'dir') {
      const isOpen = open.has(n.path);
      return (
        <li key={n.path}>
          <button
            type="button"
            aria-expanded={isOpen}
            onClick={() => toggle(n.path)}
            className="w-full flex items-center gap-1.5 pr-2.5 py-1.5 rounded-[8px] text-left text-[13px] text-ink-2 hover:bg-paper transition-colors duration-150 cursor-pointer"
            style={pad}
          >
            <ChevronRight
              aria-hidden="true"
              className={cn('w-3.5 h-3.5 shrink-0 text-muted transition-transform duration-150', isOpen && 'rotate-90')}
            />
            {isOpen ? (
              <FolderOpen className="w-3.5 h-3.5 shrink-0 text-[#8F8B84]" aria-hidden="true" />
            ) : (
              <Folder className="w-3.5 h-3.5 shrink-0 text-[#8F8B84]" aria-hidden="true" />
            )}
            <span className="truncate font-mono text-[12.5px]">{n.name}</span>
            <span className="ml-auto text-[11.5px] text-muted tabular-nums">{n.count}</span>
          </button>
          {isOpen && (
            <ul>{n.children.map((c) => renderNode(c, depth + 1))}</ul>
          )}
        </li>
      );
    }
    return (
      <li key={n.path}>
        <FileRow
          name={n.name}
          file={n.file}
          selected={n.path === selectedPath}
          onClick={() => choose(n.path)}
          style={{ paddingLeft: `${10 + depth * 14 + 20}px` }}
        />
      </li>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-220px)] lg:min-h-[560px]">
      {/* File list */}
      <div className="w-full lg:w-[300px] shrink-0 rounded-m border border-line bg-sheet flex flex-col overflow-hidden max-h-[340px] lg:max-h-none">
        <div className="p-3 border-b border-line">
          <label htmlFor="file-filter" className="sr-only">
            Filter files
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8F8B84]" aria-hidden="true" />
            <input
              id="file-filter"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Filter ${files.length} files`}
              className="w-full h-9 pl-9 pr-8 rounded-full bg-paper-2 border border-line text-[13.5px] text-ink placeholder:text-[#8F8B84] focus:outline-none focus:border-ink focus:bg-sheet transition-colors duration-150 [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear filter"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-full text-muted hover:text-ink hover:bg-paper cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-1.5">
          {q ? (
            filtered.length === 0 ? (
              <p className="p-4 text-center text-[13.5px] text-muted">No file path contains “{search.trim()}”.</p>
            ) : (
              <ul aria-label="Matching files">
                <li className="px-2.5 pt-1 pb-2 text-[12px] text-muted">
                  {filtered.length} {filtered.length === 1 ? 'match' : 'matches'}
                </li>
                {filtered.map((f) => (
                  <li key={f.path}>
                    <FileRow file={f} query={q} selected={f.path === selectedPath} onClick={() => choose(f.path)} showPath />
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ul aria-label="Repository files">
              {tree.children.map((n) => renderNode(n, 0))}
            </ul>
          )}
        </div>
        <div className="px-4 py-2 border-t border-line text-[12px] text-muted hidden lg:block">
          Click a line number to highlight it. Shift-click to select a range.
        </div>
      </div>

      {/* Viewer */}
      <div ref={viewerRef} className="flex-1 min-w-0 h-[72vh] min-h-[420px] lg:h-full scroll-mt-4">
        <CodeViewer
          filePath={selectedPath}
          content={selectedFile?.content}
          language={selectedFile?.language}
          highlightRange={highlightRange}
          onSelectLines={setHighlightRange}
        />
      </div>
    </div>
  );
}

function FileRow({
  file,
  name,
  selected,
  onClick,
  style,
  showPath,
  query,
}: {
  file: FileRecord;
  name?: string;
  selected: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  showPath?: boolean;
  query?: string;
}) {
  const Icon = isCodeFile(file.path) ? FileCode : FileText;
  const label = showPath ? file.path : name || file.path;
  let content: React.ReactNode = label;
  if (query) {
    const i = label.toLowerCase().indexOf(query);
    if (i !== -1) {
      content = (
        <>
          {label.slice(0, i)}
          <mark className="bg-lime text-ink rounded-[3px]">{label.slice(i, i + query.length)}</mark>
          {label.slice(i + query.length)}
        </>
      );
    }
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? 'true' : undefined}
      title={file.path}
      style={style}
      className={cn(
        'w-full flex items-center gap-2 pr-2.5 py-1.5 rounded-[8px] text-left transition-colors duration-150 cursor-pointer',
        !style && 'pl-2.5',
        selected ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper'
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0', selected ? 'text-[#CDEB5A]' : 'text-[#8F8B84]')} aria-hidden="true" />
      <span className={cn('font-mono text-[12.5px] min-w-0', showPath ? 'break-all' : 'truncate')}>{content}</span>
      <span className={cn('ml-auto shrink-0 text-[11.5px] tabular-nums', selected ? 'text-[#C9C5BC]' : 'text-muted')}>
        {file.line_count}
      </span>
    </button>
  );
}
