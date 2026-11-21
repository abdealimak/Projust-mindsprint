'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Sparkles,
  FileCode,
  User as UserIcon,
  Bot,
} from 'lucide-react';
import { CodeViewer } from './CodeViewer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { path: string; startLine: number; endLine: number }[];
}

interface AskTabProps {
  projectId: string;
  initialQuestion?: string | null;
  files: { path: string; content: string }[];
}

export function AskTab({ projectId, initialQuestion, files }: AskTabProps) {
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialQuestion || '');
  const [streaming, setStreaming] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  // Right pane code viewer state (when citation is clicked)
  const [activeCitation, setActiveCitation] = useState<{ path: string; lines: [number, number] } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (q?: string) => {
    const query = (q || input).trim();
    if (!query || streaming) return;

    setInput('');
    const userMsg: Message = { id: String(Date.now()), role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          threadId,
          level,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get answer');
      }

      const receivedThreadId = res.headers.get('x-thread-id');
      if (receivedThreadId) setThreadId(receivedThreadId);

      // Read stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      const assistantMsgId = String(Date.now() + 1);

      setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistantText += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: assistantText } : m))
          );
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error communicating with AI tutor';
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 2), role: 'assistant', content: `**Error:** ${errorMsg}` },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  const activeFile = files.find((f) => f.path === activeCitation?.path);

  // Render citation tokens like [[src/app.ts:10-20]] into clickable chips
  const renderMessageContent = (content: string) => {
    // Custom renderer for citation links
    const parts = content.split(/(\[\[[a-zA-Z0-9_\-./]+:\d+(?:-\d+)?\]\])/g);

    return parts.map((part, i) => {
      const match = part.match(/^\[\[([a-zA-Z0-9_\-./]+):(\d+)(?:-(\d+))?\]\]$/);
      if (match) {
        const path = match[1];
        const start = parseInt(match[2], 10);
        const end = match[3] ? parseInt(match[3], 10) : start;
        return (
          <button
            key={i}
            type="button"
            onClick={() => setActiveCitation({ path, lines: [start, end] })}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-semibold border border-amber-300/40 transition cursor-pointer"
          >
            <FileCode className="w-3 h-3" />
            <span>{path}:{start}{end !== start ? `-${end}` : ''}</span>
          </button>
        );
      }

      return (
        <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
          {part}
        </ReactMarkdown>
      );
    });
  };

  return (
    <div className="h-[calc(100vh-250px)] min-h-[500px] flex flex-col lg:flex-row gap-4">
      {/* Left Chat Pane */}
      <div className={`flex-1 flex flex-col border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-[#161a26] overflow-hidden shadow-2xs ${activeCitation ? 'lg:w-3/5' : 'w-full'}`}>
        {/* Chat Toolbar Header */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs bg-neutral-50 dark:bg-[#0c0e14]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-neutral-900 dark:text-white">Projust Tutor</span>
          </div>

          {/* Level Toggle */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-[10px] font-medium">
            {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl)}
                className={`px-2 py-0.5 rounded-md capitalize transition cursor-pointer ${
                  level === lvl
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <Bot className="w-10 h-10 text-neutral-300 dark:text-neutral-700" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Ask anything about this project
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
                Answers are grounded in actual repository source code with exact file and line citations.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`p-3 rounded-2xl max-w-2xl ${
                    m.role === 'user'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium'
                      : 'bg-neutral-50 dark:bg-[#0c0e14] text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <div className="prose dark:prose-invert text-xs space-y-2">
                      {renderMessageContent(m.content)}
                    </div>
                  ) : (
                    <span>{m.content}</span>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161a26] flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about data flow, architecture choices, or debugging..."
            disabled={streaming}
            className="flex-1 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-[#0c0e14] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="w-8 h-8 rounded-xl bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center transition disabled:opacity-40 cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Right Pane: Code Viewer (Only shown when citation clicked) */}
      {activeCitation && (
        <div className="w-full lg:w-2/5 shrink-0 h-full flex flex-col">
          <div className="flex items-center justify-between pb-2 text-xs font-semibold text-neutral-500">
            <span>Cited Source Code</span>
            <button
              type="button"
              onClick={() => setActiveCitation(null)}
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <CodeViewer
              filePath={activeCitation.path}
              content={activeFile?.content}
              highlightRange={activeCitation.lines}
            />
          </div>
        </div>
      )}
    </div>
  );
}
