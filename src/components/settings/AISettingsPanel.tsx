'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, KeyRound, Loader2, Trash2, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Callout } from '@/components/ui/Misc';
import { PROVIDERS, providerInfo, type ProviderId, type PublicAISettings } from '@/lib/ai/catalog';
import { cn } from '@/lib/utils';

type Loaded = {
  settings: PublicAISettings | null;
  server: { available: boolean; label: string | null };
  demo: boolean;
};

const CUSTOM_MODEL = '__custom__';

/**
 * Settings → AI: pick a provider and model and paste your own API key. The key goes to the
 * server once, is stored encrypted in an httpOnly cookie, and is never shown again (only a hint).
 */
export function AISettingsPanel() {
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderId>('anthropic');
  const [modelChoice, setModelChoice] = useState('claude-opus-5-5');
  const [customModel, setCustomModel] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState<'save' | 'test' | 'remove' | null>(null);
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const info = providerInfo(provider)!;
  const model = modelChoice === CUSTOM_MODEL || info.models.length === 0 ? customModel.trim() : modelChoice;
  const saved = data?.settings ?? null;
  const keyKept = saved && saved.provider === provider && !apiKey.trim();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai/settings', { cache: 'no-store' });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Could not load AI settings.');
        if (cancelled) return;
        setData(body);
        if (body.settings) fillFrom(body.settings);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not load AI settings.');
      }
    })();
    return () => {
      cancelled = true;
    };
    // fillFrom only sets state; run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fillFrom(s: PublicAISettings) {
    const p = providerInfo(s.provider);
    setProvider(s.provider);
    if (p && p.models.some((m) => m.id === s.model)) {
      setModelChoice(s.model);
      setCustomModel('');
    } else {
      setModelChoice(CUSTOM_MODEL);
      setCustomModel(s.model);
    }
    setBaseURL(s.provider === 'custom' ? s.baseURL || '' : '');
  }

  const pickProvider = (id: ProviderId) => {
    setProvider(id);
    setResult(null);
    const p = providerInfo(id)!;
    if (saved?.provider === id) return fillFrom(saved);
    setModelChoice(p.models[0]?.id ?? CUSTOM_MODEL);
    setCustomModel('');
    setBaseURL('');
  };

  const payload = () => ({ provider, model, baseURL: provider === 'custom' ? baseURL : undefined, apiKey: apiKey.trim() || undefined });

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy('save');
    setResult(null);
    try {
      const res = await fetch('/api/ai/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not save.');
      setData((d) => (d ? { ...d, settings: body.settings } : d));
      setApiKey('');
      setResult({ tone: 'success', text: `Saved. New AI jobs and tutor answers now use ${body.settings.model}.` });
    } catch (err) {
      setResult({ tone: 'error', text: err instanceof Error ? err.message : 'Could not save.' });
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy('test');
    setResult(null);
    try {
      const res = await fetch('/api/ai/settings/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
      const body = await res.json();
      setResult(body.ok ? { tone: 'success', text: `${body.detail} (${body.ms} ms)` } : { tone: 'error', text: body.error || 'Test failed.' });
    } catch {
      setResult({ tone: 'error', text: 'Could not reach the server.' });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('remove');
    setResult(null);
    try {
      await fetch('/api/ai/settings', { method: 'DELETE' });
      setData((d) => (d ? { ...d, settings: null } : d));
      setApiKey('');
      setResult({ tone: 'success', text: 'Your key was removed from this browser.' });
    } finally {
      setBusy(null);
    }
  };

  const usingNow = useMemo(() => {
    if (!data) return null;
    if (data.settings) return { tone: 'success' as const, text: `Your key · ${providerInfo(data.settings.provider)?.label} · ${data.settings.model}` };
    if (data.server.available) return { tone: 'neutral' as const, text: `Projust's shared AI · ${data.server.label}` };
    return { tone: 'error' as const, text: 'No AI set up. Add a key below to run live imports, courses, quizzes and the tutor.' };
  }, [data]);

  const canSubmit = Boolean(model) && (Boolean(apiKey.trim()) || keyKept) && (provider !== 'custom' || Boolean(baseURL.trim()));

  return (
    <Card role="tabpanel" id="settings-panel-ai" aria-labelledby="settings-tab-ai">
      <CardHeader title="AI model" />
      <CardContent className="space-y-6">
        {loadError && <Callout tone="error">{loadError}</Callout>}

        {data?.demo ? (
          <Callout tone="info" title="Demo mode uses sample data">
            The demo never calls an AI. Sign in with GitHub or Google to add your own key and run a live import.
          </Callout>
        ) : (
          <>
            {usingNow && (
              <div className="flex flex-wrap items-center gap-2 text-[14px]">
                <span className="text-muted">Live runs use:</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-[13px] font-medium',
                    usingNow.tone === 'success' && 'bg-[#E6F5D0] border-[#CFE6AE] text-[#3F6212]',
                    usingNow.tone === 'neutral' && 'bg-paper-2 border-line text-ink',
                    usingNow.tone === 'error' && 'bg-[#FDECEC] border-[#F5C6C6] text-[#9F1D1D]'
                  )}
                >
                  {usingNow.tone === 'success' && <Check className="w-3.5 h-3.5" aria-hidden />}
                  {usingNow.text}
                </span>
                {saved && <span className="font-mono text-[12.5px] text-muted">key {saved.keyHint}</span>}
              </div>
            )}

            <form onSubmit={save} className="space-y-5" noValidate>
              <fieldset>
                <legend className="text-[14px] font-medium mb-2">Provider</legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROVIDERS.map((p) => (
                    <label
                      key={p.id}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-[12px] border cursor-pointer text-[14px] transition-colors',
                        provider === p.id ? 'border-ink bg-sheet shadow-[0_0_0_1px_var(--ink)]' : 'border-line bg-paper hover:border-ink/40'
                      )}
                    >
                      <input
                        type="radio"
                        name="provider"
                        value={p.id}
                        aria-label={p.label}
                        checked={provider === p.id}
                        onChange={() => pickProvider(p.id)}
                        className="sr-only"
                      />
                      <span className={cn('w-3 h-3 rounded-full border', provider === p.id ? 'bg-ink border-ink' : 'border-line-2')} aria-hidden />
                      {p.label}
                    </label>
                  ))}
                </div>
                {info.note && <p className="mt-2 text-[13px] text-muted">{info.note}</p>}
              </fieldset>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ai-model" className="block text-[14px] font-medium mb-1.5">
                    Model
                  </label>
                  {info.models.length > 0 && (
                    <select id="ai-model" value={modelChoice} onChange={(e) => setModelChoice(e.target.value)} className="pj-input w-full">
                      {info.models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                      {provider !== 'anthropic' && <option value={CUSTOM_MODEL}>Other model id…</option>}
                    </select>
                  )}
                  {(info.models.length === 0 || modelChoice === CUSTOM_MODEL) && (
                    <input
                      id={info.models.length === 0 ? 'ai-model' : 'ai-model-custom'}
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder="Model id, exactly as the provider writes it"
                      className={cn('pj-input w-full font-mono text-[14px]', info.models.length > 0 && 'mt-2')}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  )}
                </div>

                {provider === 'custom' && (
                  <div>
                    <label htmlFor="ai-base" className="block text-[14px] font-medium mb-1.5">
                      Endpoint URL
                    </label>
                    <input
                      id="ai-base"
                      value={baseURL}
                      onChange={(e) => setBaseURL(e.target.value)}
                      placeholder="https://api.example.com/v1"
                      className="pj-input w-full font-mono text-[14px]"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                )}

                <div className={cn(provider === 'custom' && 'sm:col-span-2')}>
                  <label htmlFor="ai-key" className="flex items-center justify-between text-[14px] font-medium mb-1.5">
                    <span>API key</span>
                    {info.keyUrl && (
                      <a href={info.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-normal text-muted hover:text-ink">
                        Get a key <ExternalLink className="w-3 h-3" aria-hidden />
                      </a>
                    )}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
                    <input
                      id="ai-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={keyKept ? `Saved (${saved?.keyHint}). Leave empty to keep it.` : info.keyPrefix ? `${info.keyPrefix}…` : 'Paste your key'}
                      className="pj-input w-full pl-9 font-mono text-[14px]"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>

              {result && <Callout tone={result.tone}>{result.text}</Callout>}

              <div className="flex flex-wrap items-center gap-2">
                <button type="submit" className="pj-btn" disabled={!canSubmit || busy !== null}>
                  {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Check className="w-4 h-4" aria-hidden />}
                  Save
                </button>
                <button type="button" onClick={test} className="pj-btn pj-btn-ghost" disabled={!canSubmit || busy !== null}>
                  {busy === 'test' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Zap className="w-4 h-4" aria-hidden />}
                  Test connection
                </button>
                {saved && (
                  <button type="button" onClick={remove} className="pj-btn pj-btn-ghost ml-auto" disabled={busy !== null}>
                    <Trash2 className="w-4 h-4" aria-hidden />
                    Remove my key
                  </button>
                )}
              </div>

              <p className="text-[12.5px] leading-relaxed text-muted max-w-[70ch]">
                Your key is sent to Projust once, stored encrypted in a secure cookie in this browser, and used only for
                your own projects. It is never shown again, logged, or saved in our database. Usage is billed by your
                provider. Remove it here at any time.
              </p>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
