'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Link2 } from 'lucide-react';

/** Copies the current page URL. Shows "Link copied" for a moment instead of an alert. */
export function CopyLinkButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    const url = window.location.href.split('#')[0];
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API blocked: fall back to a hidden textarea.
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button type="button" onClick={copy} className={className ?? 'pj-btn'}>
      {copied ? <Check className="w-4 h-4" aria-hidden /> : <Link2 className="w-4 h-4" aria-hidden />}
      <span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span>
    </button>
  );
}

const CODE_RE = /^PJ-\d{4}-[A-Z0-9]{6}$/;

/** Small form that opens /cert/<CODE> for another certificate ID. */
export function VerifyForm({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = value.trim().toUpperCase().replace(/\s+/g, '');
    if (!CODE_RE.test(code)) {
      setError('Enter an ID like PJ-2026-A7X9K2.');
      return;
    }
    setError(null);
    router.push(`/cert/${code}`);
  };

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <label htmlFor="verify-code" className="block text-[14px] font-medium">
        Verify another certificate ID
      </label>
      <div className="mt-2 flex flex-col sm:flex-row gap-2">
        <input
          id="verify-code"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="PJ-2026-XXXXXX"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? 'verify-code-error' : undefined}
          className="h-11 flex-1 min-w-0 rounded-full border border-line bg-sheet px-4 font-mono text-[14px] uppercase placeholder:normal-case placeholder:text-muted"
        />
        <button type="submit" className="pj-btn pj-btn-ghost h-11">
          Verify ID
        </button>
      </div>
      {error && (
        <p id="verify-code-error" className="mt-2 text-[13px] text-warn">
          {error}
        </p>
      )}
    </form>
  );
}
