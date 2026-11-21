import React from 'react';
import { mockLatestChanges } from '@/lib/mock';
import { TagIcon } from '@primer/octicons-react';

export function LatestChanges() {
  return (
    <div className="rounded-xl border border-border bg-canvas-subtle p-4 shadow-xs">
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border">
        <TagIcon className="w-4 h-4 text-accent" />
        <h2 className="text-[14px] font-semibold text-fg">Platform Updates</h2>
      </div>

      <div className="divide-y divide-border/50 space-y-3">
        {mockLatestChanges.map((change, idx) => (
          <div key={idx} className={idx > 0 ? 'pt-3' : ''}>
            <span className="text-[10px] text-fg-muted font-mono block mb-1">
              {change.date}
            </span>
            <h4 className="text-[12px] font-semibold text-fg hover:text-accent cursor-pointer transition-colors">
              {change.title}
            </h4>
            <p className="text-[11px] text-fg-muted leading-relaxed mt-1">
              {change.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
