'use client';

import React, { useState } from 'react';
import { Search, File } from 'lucide-react';
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

export function FilesTab({ files, initialFilePath, initialLines }: FilesTabProps) {
  const [search, setSearch] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(
    initialFilePath || (files.length > 0 ? files[0].path : null)
  );
  const [highlightRange, setHighlightRange] = useState<[number, number] | null>(initialLines || null);

  const selectedFile = files.find((f) => f.path === selectedPath);

  const filtered = files.filter((f) =>
    f.path.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-250px)] min-h-[500px] flex flex-col lg:flex-row gap-4">
      {/* Left File Tree Sidebar */}
      <div className="w-full lg:w-72 shrink-0 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-[#161a26] flex flex-col overflow-hidden shadow-2xs">
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter files..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-[#0c0e14] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-400">
              No matching files
            </div>
          ) : (
            filtered.map((file) => {
              const isSelected = file.path === selectedPath;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => {
                    setSelectedPath(file.path);
                    setHighlightRange(null);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-left font-mono text-xs flex items-center gap-2 transition cursor-pointer truncate ${
                    isSelected
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <File className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{file.path}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Code Viewer */}
      <div className="flex-1 min-w-0 h-full">
        <CodeViewer
          filePath={selectedPath}
          content={selectedFile?.content}
          highlightRange={highlightRange}
        />
      </div>
    </div>
  );
}
