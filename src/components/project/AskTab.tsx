'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUp, FileCode, X, ArrowUpRight, RotateCcw, Plus, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CodeRef } from '@/types/learning';
import { Markdown, extractCitations, CodeRefChip, Spinner } from '@/components/learning/shared';
import { CodeViewer } from './CodeViewer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { path: string; startLine: number; endLine: number }[];
  /** Set on a failed answer; `question` is what to resend. */
  error?: boolean;
  question?: string;
}

type Level = 'beginner' | 'intermediate' | 'advanced';

interface AskTabProps {
  projectId: string;
  initialQuestion?: string | null;
  files: { path: string; content: string; language?: string }[];
  /** Opens a citation in the Files tab. */
  onOpenFile?: (ref: CodeRef) => void;
  /** Starter questions shown before the first message. */
  suggestions?: string[];
  /** Short repo name used in the empty state. */
  repoName?: string;
  className?: string;
}

const DEFAULT_SUGGESTIONS = [
  'Walk me through what happens when a request comes in.',
  'Which file should I read first, and why?',
  'Where is the riskiest code in this project?',
];

const LEVELS: { value: Level; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export function AskTab({ projectId, initialQuestion, files, onOpenFile, suggestions, repoName, className }: AskTabProps) {
  const [level, setLevel] = useState<Level>('intermediate');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialQuestion || '');
  const [streaming, setStreaming] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  // Right pane code viewer state (when citation is clicked)
  const [activeCitation, setActiveCitation] = useState<{ path: string; lines: [number, number] } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // A new starter question (from Overview or Concepts) replaces the draft, not the conversation.
  useEffect(() => {
    if (initialQuestion) setInput(initialQuestion);
  }, [initialQuestion]);

  // Follow the answer while it streams, unless the reader scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Grow the input with its content (up to ~6 lines).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input]);

  // Close the phone code sheet with Escape.
  useEffect(() => {
    if (!activeCitation) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActiveCitation(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeCitation]);

  const handleSend = async (q?: string) => {
    const query = (q || input).trim();
    if (!query || streaming) return;

    setInput('');
    stickRef.current = true;
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
        ...prev.filter((m) => !(m.role === 'assistant' && m.content === '' && !m.error)),
        { id: String(Date.now() + 2), role: 'assistant', content: errorMsg, error: true, question: query },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  const openCitation = useCallback((r: CodeRef) => {
    setActiveCitation((cur) =>
      cur && cur.path === r.path && cur.lines[0] === r.startLine && cur.lines[1] === r.endLine
        ? null
        : { path: r.path, lines: [r.startLine, r.endLine] }
    );
  }, []);

  const activeFile = files.find((f) => f.path === activeCitation?.path);
  const activeRef: CodeRef | null = activeCitation
    ? { path: activeCitation.path, startLine: activeCitation.lines[0], endLine: activeCitation.lines[1] }
    : null;

  const reset = () => {
    if (streaming) return;
    setMessages([]);
    setThreadId(null);
    setActiveCitation(null);
    inputRef.current?.focus();
  };

  const prefill = (q: string) => {
    setInput(q);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(q.length, q.length);
    });
  };

  const lastMsg = messages[messages.length - 1];
  const waiting = streaming && lastMsg?.role === 'user';
  const starters = (suggestions && suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS).slice(0, 4);

  return (
    <div className={cn('flex flex-col lg:flex-row gap-4 h-[78vh] min-h-[520px] lg:h-[calc(100vh-220px)] lg:min-h-[560px]', className)}>
      {/* Chat */}
      <section
        aria-label="Tutor conversation"
        className={cn('flex-1 min-w-0 flex flex-col rounded-m border border-line bg-sheet overflow-hidden', activeCitation && 'lg:basis-[54%]')}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 border-b border-line bg-paper-2">
          <div className="flex items-center gap-2 min-w-0 mr-auto">
            <span aria-hidden="true" className="w-7 h-7 rounded-full bg-lime border border-[#B9D84A] grid place-items-center">
              <MessageSquare className="w-3.5 h-3.5 text-ink" />
            </span>
            <span className="text-[14px] font-semibold text-ink">Tutor</span>
            {threadId && <span className="hidden sm:inline text-[12.5px] text-muted">Remembers this conversation</span>}
          </div>

          <div className="flex items-center gap-2">
            <span id="ask-level-label" className="hidden sm:inline text-[12.5px] text-muted">
              Explain for
            </span>
            <div className="flex p-0.5 gap-0.5 rounded-full border border-line bg-sheet" role="radiogroup" aria-labelledby="ask-level-label">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  role="radio"
                  aria-checked={level === l.value}
                  onClick={() => setLevel(l.value)}
                  className={cn(
                    'h-7 px-2.5 sm:px-3 rounded-full text-[12.5px] font-medium transition-colors duration-150 cursor-pointer',
                    level === l.value ? 'bg-olive text-[#F6F8EC]' : 'text-ink-2 hover:bg-paper'
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={reset}
                disabled={streaming}
                title="Start a new conversation"
                aria-label="Start a new conversation"
                className="w-8 h-8 grid place-items-center rounded-full text-ink-2 hover:bg-sheet disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
          aria-busy={streaming}
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-2 py-6">
              <h3 className="pj-display text-[clamp(28px,3vw,36px)] max-w-[22ch]">
                Start with a question <em>about {repoName ? <span className="font-mono not-italic text-[0.72em] tracking-normal">{repoName}</span> : 'your code'}.</em>
              </h3>
              <p className="mt-3 text-[14.5px] text-muted max-w-[46ch]">
                Answers come from your repository. Every claim cites a file and line range; click a citation to see the
                code next to the answer.
              </p>
              <div className="mt-6 grid gap-2 w-full max-w-[520px]">
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => prefill(s)}
                    className="text-left px-4 py-3 rounded-[14px] border border-line bg-sheet text-[14.5px] text-ink-2 hover:border-line-2 hover:bg-paper-2 transition-colors duration-150 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ol className="space-y-6 max-w-[760px] mx-auto">
              {messages.map((m, i) => {
                const isLast = i === messages.length - 1;
                if (m.role === 'user') {
                  return (
                    <li key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-[18px] rounded-br-[6px] bg-ink text-paper px-4 py-2.5 text-[15px] leading-[1.55] whitespace-pre-wrap break-words">
                        <span className="sr-only">You: </span>
                        {m.content}
                      </div>
                    </li>
                  );
                }
                if (m.error) {
                  return (
                    <li key={m.id} className="flex gap-3">
                      <TutorMark />
                      <div role="alert" className="min-w-0 flex-1 rounded-[14px] border border-[#F5CFCF] bg-[#FDF1F1] px-4 py-3">
                        <p className="text-[14.5px] text-[#9B1C23]">
                          <span className="font-medium">No answer this time.</span> {m.content}
                        </p>
                        {m.question && isLast && (
                          <button
                            type="button"
                            onClick={() => handleSend(m.question)}
                            disabled={streaming}
                            className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[#F5CFCF] bg-sheet text-[13px] font-medium text-ink hover:border-[#E8B4B4] disabled:opacity-50 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                            Ask again
                          </button>
                        )}
                      </div>
                    </li>
                  );
                }
                const cites = extractCitations(m.content);
                const live = streaming && isLast;
                return (
                  <li key={m.id} className="flex gap-3">
                    <TutorMark />
                    <div className="min-w-0 flex-1">
                      <span className="sr-only">Tutor: </span>
                      {m.content ? (
                        <Markdown onOpenRef={openCitation} activeRef={activeRef} className="text-[15.5px] leading-[1.65]">
                          {m.content}
                        </Markdown>
                      ) : (
                        <ThinkingLine />
                      )}
                      {live && m.content && (
                        <p className="mt-2 inline-flex items-center gap-2 text-[12.5px] text-muted">
                          <Spinner className="w-3 h-3" />
                          Writing
                        </p>
                      )}
                      {!live && cites.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-line">
                          <p className="text-[12.5px] text-muted mb-1.5">
                            {cites.length === 1 ? '1 source' : `${cites.length} sources`} in your code
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {cites.map((c) => (
                              <CodeRefChip
                                key={`${c.path}:${c.startLine}-${c.endLine}`}
                                codeRef={c}
                                onOpen={openCitation}
                                active={!!activeRef && activeRef.path === c.path && activeRef.startLine === c.startLine && activeRef.endLine === c.endLine}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
              {waiting && (
                <li className="flex gap-3">
                  <TutorMark />
                  <ThinkingLine />
                </li>
              )}
            </ol>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-line bg-sheet"
        >
          <div className="flex items-end gap-2 rounded-[22px] border border-line-2 bg-sheet pl-4 pr-1.5 py-1.5 focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgba(17,17,16,.06)] transition-[border-color,box-shadow] duration-200">
            <label htmlFor="ask-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="ask-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about data flow, a design choice, or a bug…"
              disabled={streaming}
              className="flex-1 min-w-0 resize-none bg-transparent py-1.5 text-[15px] leading-[1.5] text-ink placeholder:text-[#8F8B84] focus:outline-none disabled:opacity-60 max-h-[168px]"
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              aria-label={streaming ? 'Waiting for the answer' : 'Send question'}
              className="w-9 h-9 shrink-0 rounded-full bg-ink text-paper grid place-items-center transition-[transform,opacity] duration-150 hover:-translate-y-0.5 disabled:opacity-30 disabled:hover:translate-y-0 disabled:cursor-not-allowed cursor-pointer"
            >
              {streaming ? <Spinner className="w-3.5 h-3.5" /> : <ArrowUp className="w-4 h-4" strokeWidth={2.5} />}
            </button>
          </div>
          <p className="hidden sm:block mt-1.5 px-2 text-[12px] text-muted">Enter sends. Shift + Enter adds a line.</p>
        </form>
      </section>

      {/* Cited code: side pane on desktop, bottom sheet on phones */}
      {activeCitation && (
        <>
          <button
            type="button"
            aria-label="Close cited code"
            onClick={() => setActiveCitation(null)}
            className="lg:hidden fixed inset-0 z-40 bg-[rgba(17,17,16,0.3)]"
          />
          <aside
            aria-label="Cited code"
            className="fixed inset-x-0 bottom-0 z-50 h-[72vh] p-3 pt-0 bg-paper rounded-t-[22px] border-t border-line shadow-lift flex flex-col lg:static lg:z-auto lg:h-full lg:p-0 lg:bg-transparent lg:rounded-none lg:border-0 lg:shadow-none lg:basis-[46%] lg:min-w-0"
          >
            <div className="flex items-center gap-2 py-2.5 lg:pt-0 lg:pb-2">
              <span className="text-[13px] font-medium text-ink-2 inline-flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5" aria-hidden="true" />
                Cited code
              </span>
              <div className="ml-auto flex items-center gap-1">
                {onOpenFile && activeRef && (
                  <button
                    type="button"
                    onClick={() => onOpenFile(activeRef)}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] font-medium text-ink-2 hover:bg-sheet cursor-pointer"
                  >
                    Open in Files
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveCitation(null)}
                  aria-label="Close cited code"
                  className="w-8 h-8 grid place-items-center rounded-full text-ink-2 hover:bg-sheet cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <CodeViewer
                filePath={activeCitation.path}
                content={activeFile?.content}
                language={activeFile?.language}
                highlightRange={activeCitation.lines}
              />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function TutorMark() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 w-7 h-7 shrink-0 rounded-full bg-paper-2 border border-line grid place-items-center font-serif text-[15px] leading-none text-ink"
    >
      P
    </span>
  );
}

function ThinkingLine() {
  return (
    <p className="inline-flex items-center gap-2 h-7 text-[14px] text-muted" role="status">
      <Spinner className="w-3.5 h-3.5" />
      Reading your code
    </p>
  );
}
