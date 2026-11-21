'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  CommentDiscussionIcon,
  PaperAirplaneIcon,
  RepoIcon,
  ShieldLockIcon,
} from '@primer/octicons-react';

function TutorContent() {
  const searchParams = useSearchParams();
  const initialProject = searchParams.get('project') || 'alexchen-dev/shop-api';
  const initialQuery = searchParams.get('q') || '';

  const [input, setInput] = useState(initialQuery);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi Alex! I am your Projust project tutor. I have ingested the shop-api codebase (18 concepts mapped across routes, middleware, and services). Ask me anything about how your code works, why specific design choices were made, or how to prepare for quiz questions.',
    },
    ...(initialQuery
      ? [
          { role: 'user', content: initialQuery },
          {
            role: 'assistant',
            content:
              'In your shop-api project, session tokens are stored in HTTP-only, SameSite=Lax cookies rather than localStorage to protect against Cross-Site Scripting (XSS) attacks. If client JavaScript were compromised, malicious scripts could read tokens from localStorage, whereas HTTP-only cookies are inaccessible to document.cookie. However, cookies require CSRF protection, which you implemented via custom headers and token validation.',
          },
        ]
      : []),
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userText },
      {
        role: 'assistant',
        content: `Regarding "${userText}": In ${initialProject}, this pattern relates directly to your architecture modules. (Note: LLM tutor endpoint will be integrated in phase 2. Responses will reference exact files and line ranges.)`,
      },
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg flex items-center gap-2">
            <CommentDiscussionIcon className="w-5 h-5 text-accent" />
            AI Project Tutor
          </h1>
          <p className="text-[13px] text-fg-muted mt-0.5">
            Ask anything about your uploaded repository. Answers are grounded directly in your code.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="accent" size="md">
            <RepoIcon className="w-3.5 h-3.5 mr-1" />
            {initialProject}
          </Badge>
        </div>
      </div>

      {/* Chat conversation area */}
      <Card className="flex flex-col h-[560px]">
        <CardHeader
          title="Tutor Session"
          action={
            <span className="text-[11px] text-fg-muted flex items-center gap-1">
              <ShieldLockIcon className="w-3 h-3 text-success" />
              Grounded in commit a8b34c1
            </span>
          }
        />
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-canvas/40">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                m.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="text-[11px] font-semibold text-fg-muted mb-1 px-1">
                {m.role === 'user' ? 'You' : 'Projust Code Tutor'}
              </div>
              <div
                className={`max-w-xl rounded-[6px] p-3 text-[13px] leading-relaxed border ${
                  m.role === 'user'
                    ? 'bg-accent/15 text-fg border-accent/40'
                    : 'bg-canvas-subtle text-fg border-border shadow-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} className="p-3 border-t border-border bg-canvas flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your code or architecture…"
            className="flex-1 bg-canvas-subtle border border-border rounded-[6px] px-3 py-2 text-[13px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <Button type="submit" variant="primary" disabled={!input.trim()}>
            <PaperAirplaneIcon className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function TutorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-fg-muted">Loading tutor…</div>}>
      <TutorContent />
    </Suspense>
  );
}
