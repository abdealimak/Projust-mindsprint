'use client';

import React, { useEffect, useRef } from 'react';
import { FileCode, Copy, Check } from 'lucide-react';

interface CodeViewerProps {
  filePath?: string | null;
  content?: string | null;
  highlightRange?: [number, number] | null; // [startLine, endLine]
}

export function CodeViewer({ filePath, content, highlightRange }: CodeViewerProps) {
  const [copied, setCopied] = React.useState(false);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightRange && targetLineRef.current && codeContainerRef.current) {
      targetLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightRange, filePath]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!filePath || content === undefined || content === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-neutral-400 bg-white/50 dark:bg-[#0c0e14]/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
        <FileCode className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-xs">Select a file from the tree or click a citation chip to view code</p>
      </div>
    );
  }

  const lines = content.split('\n');
  const padLength = String(lines.length).length;

  return (
    <div className="h-full flex flex-col border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-[#0c0e14] overflow-hidden shadow-2xs">
      {/* File Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#161a26] text-xs">
        <div className="flex items-center gap-2 truncate">
          <FileCode className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span className="font-mono font-medium text-neutral-900 dark:text-white truncate">
            {filePath}
          </span>
          <span className="text-[10px] text-neutral-400">
            ({lines.length} lines)
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="p-1 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
          title="Copy file contents"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Code Area with Line Numbers */}
      <div
        ref={codeContainerRef}
        className="flex-1 overflow-auto font-mono text-[11px] leading-relaxed p-3 bg-neutral-950 text-neutral-100"
      >
        {lines.map((lineText, idx) => {
          const lineNum = idx + 1;
          const isHighlighted =
            highlightRange &&
            lineNum >= highlightRange[0] &&
            lineNum <= highlightRange[1];

          return (
            <div
              key={lineNum}
              ref={isHighlighted && lineNum === highlightRange[0] ? targetLineRef : undefined}
              className={`flex items-start px-2 py-0.5 rounded-xs transition-colors ${
                isHighlighted
                  ? 'bg-amber-500/20 border-l-2 border-amber-400'
                  : 'hover:bg-neutral-900/60'
              }`}
            >
              <span className="select-none text-neutral-500 text-right pr-4 shrink-0 w-10">
                {String(lineNum).padStart(padLength, ' ')}
              </span>
              <span className="whitespace-pre overflow-x-auto flex-1 font-mono">
                {lineText || ' '}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
