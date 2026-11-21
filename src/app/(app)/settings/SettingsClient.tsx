'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Profile } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar, Skeleton } from '@/components/ui/Misc';
import { PageHeader } from '@/components/layout/PageHeader';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/auth';
import { cn } from '@/lib/utils';
import {
  PersonIcon,
  ShieldCheckIcon,
  EyeIcon,
  MarkGithubIcon,
  MailIcon,
  CheckIcon,
  AlertIcon,
} from '@primer/octicons-react';

type SettingsProfile = Profile & { public_profile?: boolean };
type Tab = 'profile' | 'account' | 'privacy';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'blocked';

const FIELDS = ['username', 'full_name', 'headline', 'bio', 'linkedin_url'] as const;
type Field = (typeof FIELDS)[number];
type FormValues = Record<Field, string>;
type FieldErrors = Partial<Record<Field | 'public_profile', string>>;

const LIMITS: Record<Exclude<Field, 'username'>, number> = {
  full_name: 80,
  headline: 120,
  bio: 600,
  linkedin_url: 300,
};
const LINKEDIN_RE = /^https:\/\/(www\.)?linkedin\.com(\/[^\s]*)?$/i;

/** Mirrors the server's zod rules so people see problems on blur, before saving. */
function validateField(field: Field, raw: string): string | undefined {
  const v = raw.trim();
  if (field === 'username') {
    if (v.length < 3) return 'Username needs at least 3 characters.';
    if (v.length > 30) return 'Username can be at most 30 characters.';
    if (!/^[a-z0-9_-]+$/.test(v)) return 'Use only lowercase letters, numbers, - and _ in your username.';
    return undefined;
  }
  const max = LIMITS[field];
  if (v.length > max) return `Keep this under ${max} characters (now ${v.length}).`;
  if (field === 'linkedin_url' && v && !LINKEDIN_RE.test(v)) {
    return 'Use a full LinkedIn link that starts with https://linkedin.com or https://www.linkedin.com.';
  }
  return undefined;
}

function toForm(p: SettingsProfile): FormValues {
  return {
    username: p.username || '',
    full_name: p.full_name || '',
    headline: p.headline || '',
    bio: p.bio || '',
    linkedin_url: p.linkedin_url || '',
  };
}

const PROVIDER_LABEL: Record<string, string> = {
  'google.com': 'Google',
  'github.com': 'GitHub',
  password: 'Email and password',
};

const inputBase =
  'w-full bg-sheet border border-line-2 text-[14.5px] text-ink placeholder:text-muted/70 ' +
  'transition-colors focus:outline-none focus:border-ink disabled:bg-paper disabled:text-muted';

export default function SettingsClient({ initialProfile }: { initialProfile: Profile }) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<SettingsProfile>(initialProfile);
  const [isDemo, setIsDemo] = useState(initialProfile.id.startsWith('demo:'));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormValues>(() => toForm(initialProfile));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const [privacyStatus, setPrivacyStatus] = useState<SaveStatus>('idle');
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);

  const [github, setGithub] = useState<'checking' | 'connected' | 'disconnected' | 'unknown'>('checking');
  const [provider, setProvider] = useState<string | null>(null);

  // Load the saved profile from the server route.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profile', { cache: 'no-store' });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(body.error || "Couldn't load your profile. Refresh the page to try again.");
        } else {
          setProfile(body.profile);
          setForm(toForm(body.profile));
          setIsDemo(Boolean(body.demo));
        }
      } catch {
        if (!cancelled) setLoadError("Couldn't load your profile. Check your connection and refresh.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // GitHub repo access is a separate OAuth grant; ask the repos route for the truth.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/github/repos', { cache: 'no-store' })
      .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
      .then(({ ok, b }) => {
        if (cancelled) return;
        if (!ok && typeof b?.connected !== 'boolean') setGithub('unknown');
        else setGithub(b.connected ? 'connected' : 'disconnected');
      })
      .catch(() => !cancelled && setGithub('unknown'));
    return () => {
      cancelled = true;
    };
  }, []);

  // Which identity provider the person signed in with (read-only, from Firebase).
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    try {
      return onAuthStateChanged(getFirebaseAuth(), (u) => {
        setProvider(u?.providerData[0]?.providerId ?? null);
      });
    } catch {
      return undefined;
    }
  }, []);

  const saved = useMemo(() => toForm(profile), [profile]);
  const dirty = FIELDS.some((f) => form[f].trim() !== saved[f].trim());
  const hasErrors = FIELDS.some((f) => fieldErrors[f]);

  const setField = (field: Field, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear the error as soon as the value becomes valid again.
    if (fieldErrors[field] && !validateField(field, value)) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (status !== 'idle' && status !== 'saving') {
      setStatus('idle');
      setMessage(null);
    }
  };

  const blurField = (field: Field) => {
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, form[field]) }));
  };

  const patchProfile = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return { res, body };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: FieldErrors = {};
    FIELDS.forEach((f) => {
      const err = validateField(f, form[f]);
      if (err) nextErrors[f] = err;
    });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus('error');
      setMessage('Fix the highlighted fields, then save again.');
      return;
    }

    const payload: Partial<FormValues> = {};
    FIELDS.forEach((f) => {
      if (form[f].trim() !== saved[f].trim()) payload[f] = form[f].trim();
    });

    setStatus('saving');
    setMessage(null);
    try {
      const { res, body } = await patchProfile(payload);
      if (res.ok) {
        setProfile(body.profile);
        setForm(toForm(body.profile));
        setStatus('saved');
        setMessage('Profile saved.');
        return;
      }
      if (res.status === 400 && body.fieldErrors) setFieldErrors(body.fieldErrors);
      setStatus(res.status === 403 ? 'blocked' : 'error');
      setMessage(body.error || "Couldn't save your profile. Try again.");
    } catch {
      setStatus('error');
      setMessage("Couldn't reach the server. Check your connection and try again.");
    }
  };

  const togglePublic = async () => {
    const next = !(profile.public_profile ?? true);
    const prev = profile;
    setProfile({ ...profile, public_profile: next });
    setPrivacyStatus('saving');
    setPrivacyMessage(null);
    try {
      const { res, body } = await patchProfile({ public_profile: next });
      if (res.ok) {
        setProfile(body.profile);
        setPrivacyStatus('saved');
        setPrivacyMessage(next ? 'Your profile is public.' : 'Your profile is now private.');
        return;
      }
      setProfile(prev);
      setPrivacyStatus(res.status === 403 ? 'blocked' : 'error');
      setPrivacyMessage(body.error || "Couldn't update visibility. Try again.");
    } catch {
      setProfile(prev);
      setPrivacyStatus('error');
      setPrivacyMessage("Couldn't reach the server. Check your connection and try again.");
    }
  };

  const tabs: { id: Tab; label: string; short: string; icon: typeof PersonIcon }[] = [
    { id: 'profile', label: 'Profile', short: 'Profile', icon: PersonIcon },
    { id: 'account', label: 'Account & providers', short: 'Account', icon: ShieldCheckIcon },
    { id: 'privacy', label: 'Privacy', short: 'Privacy', icon: EyeIcon },
  ];

  const isPublic = profile.public_profile ?? true;
  const providerLabel = isDemo
    ? 'Demo session'
    : provider
      ? PROVIDER_LABEL[provider] || provider
      : profile.email
        ? 'Signed in'
        : 'Unknown';

  return (
    <div className="px-5 sm:px-10 lg:px-14 py-10 lg:py-12 max-w-[1040px] mx-auto w-full space-y-6">
      <PageHeader
        className="mb-2"
        eyebrow="Settings"
        title="Your account,"
        em="your rules."
        description="Profile, connected accounts and what recruiters can see."
      />

      <div
        role="tablist"
        aria-label="Settings sections"
        className="grid grid-cols-3 sm:inline-flex p-1 gap-0.5 rounded-full border border-line bg-sheet sm:w-fit"
      >
        {tabs.map(({ id, label, short, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center justify-center gap-2 h-9 px-3 sm:px-4 rounded-full text-[14px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40',
              activeTab === id ? 'bg-olive text-[#F6F8EC] shadow-pill' : 'text-ink-2 hover:bg-paper'
            )}
          >
            <Icon className="w-4 h-4 hidden sm:block" />
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {loadError && <Notice tone="error">{loadError}</Notice>}

      {isDemo && !loading && (
        <Notice tone="info">
          You&apos;re in a demo session. You can try the form, but changes won&apos;t be saved until you sign in
          with GitHub or Google.
        </Notice>
      )}

      {/* Profile */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader title="Public profile" />
          <CardContent>
            <form onSubmit={handleSaveProfile} noValidate className="space-y-5">
              <div className="flex items-center gap-4 pb-5 border-b border-line">
                <Avatar
                  src={profile.avatar_url}
                  fallback={(form.full_name || form.username || 'U')[0]}
                  size="xl"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-ink truncate">{form.full_name || form.username}</p>
                  <p className="text-[13px] text-muted">Your photo comes from the account you signed in with.</p>
                </div>
              </div>

              {loading ? (
                <div className="space-y-4" aria-busy="true" aria-label="Loading profile">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-11 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      id="full_name"
                      label="Full name"
                      error={fieldErrors.full_name}
                      count={{ value: form.full_name.length, max: LIMITS.full_name }}
                    >
                      <input
                        id="full_name"
                        type="text"
                        autoComplete="name"
                        value={form.full_name}
                        onChange={(e) => setField('full_name', e.target.value)}
                        onBlur={() => blurField('full_name')}
                        aria-invalid={Boolean(fieldErrors.full_name)}
                        aria-describedby={fieldErrors.full_name ? 'full_name-error' : undefined}
                        className={cn(inputBase, 'h-11 rounded-full px-4', fieldErrors.full_name && 'border-warn')}
                      />
                    </FormField>

                    <FormField
                      id="username"
                      label="Username"
                      hint={
                        <>
                          Your public link:{' '}
                          <span className="font-mono text-[12px]">/u/{form.username || 'username'}</span>
                        </>
                      }
                      error={fieldErrors.username}
                    >
                      <input
                        id="username"
                        type="text"
                        autoComplete="username"
                        spellCheck={false}
                        value={form.username}
                        onChange={(e) => setField('username', e.target.value.toLowerCase())}
                        onBlur={() => blurField('username')}
                        aria-invalid={Boolean(fieldErrors.username)}
                        aria-describedby={fieldErrors.username ? 'username-error' : 'username-hint'}
                        className={cn(
                          inputBase,
                          'h-11 rounded-full px-4 font-mono text-[13.5px]',
                          fieldErrors.username && 'border-warn'
                        )}
                      />
                    </FormField>
                  </div>

                  <FormField
                    id="headline"
                    label="Headline"
                    error={fieldErrors.headline}
                    count={{ value: form.headline.length, max: LIMITS.headline }}
                  >
                    <input
                      id="headline"
                      type="text"
                      value={form.headline}
                      onChange={(e) => setField('headline', e.target.value)}
                      onBlur={() => blurField('headline')}
                      placeholder="Full-stack builder, distributed systems"
                      aria-invalid={Boolean(fieldErrors.headline)}
                      aria-describedby={fieldErrors.headline ? 'headline-error' : undefined}
                      className={cn(inputBase, 'h-11 rounded-full px-4', fieldErrors.headline && 'border-warn')}
                    />
                  </FormField>

                  <FormField
                    id="bio"
                    label="Bio"
                    error={fieldErrors.bio}
                    count={{ value: form.bio.length, max: LIMITS.bio }}
                  >
                    <textarea
                      id="bio"
                      rows={4}
                      value={form.bio}
                      onChange={(e) => setField('bio', e.target.value)}
                      onBlur={() => blurField('bio')}
                      placeholder="What you build, what you're learning and what you want to work on next."
                      aria-invalid={Boolean(fieldErrors.bio)}
                      aria-describedby={fieldErrors.bio ? 'bio-error' : undefined}
                      className={cn(inputBase, 'rounded-2xl px-4 py-3 resize-y leading-relaxed', fieldErrors.bio && 'border-warn')}
                    />
                  </FormField>

                  <FormField id="linkedin_url" label="LinkedIn profile URL" error={fieldErrors.linkedin_url}>
                    <input
                      id="linkedin_url"
                      type="url"
                      inputMode="url"
                      value={form.linkedin_url}
                      onChange={(e) => setField('linkedin_url', e.target.value)}
                      onBlur={() => blurField('linkedin_url')}
                      placeholder="https://www.linkedin.com/in/username"
                      aria-invalid={Boolean(fieldErrors.linkedin_url)}
                      aria-describedby={fieldErrors.linkedin_url ? 'linkedin_url-error' : undefined}
                      className={cn(inputBase, 'h-11 rounded-full px-4', fieldErrors.linkedin_url && 'border-warn')}
                    />
                  </FormField>

                  <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!dirty || status === 'saving' || hasErrors}
                      className="w-full sm:w-auto"
                    >
                      {status === 'saving' ? 'Saving profile…' : 'Save profile'}
                    </Button>
                    {dirty && status === 'idle' && (
                      <Button
                        type="button"
                        variant="invisible"
                        onClick={() => {
                          setForm(saved);
                          setFieldErrors({});
                        }}
                        className="w-full sm:w-auto"
                      >
                        Discard changes
                      </Button>
                    )}
                    <StatusLine status={status} message={message} />
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Account & providers */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Sign-in" />
            <CardContent>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper">
                  {provider === 'github.com' ? (
                    <MarkGithubIcon className="w-4 h-4 text-ink" />
                  ) : (
                    <MailIcon className="w-4 h-4 text-ink" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold text-ink">{providerLabel}</p>
                  <p className="text-[13px] text-muted break-all">
                    {isDemo ? 'No email. Demo sessions are not linked to an account.' : profile.email || 'No email on this account.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="GitHub repository access"
              action={
                github === 'checking' ? (
                  <Badge>Checking…</Badge>
                ) : github === 'connected' ? (
                  <Badge variant="success">Connected</Badge>
                ) : github === 'disconnected' ? (
                  <Badge>Not connected</Badge>
                ) : (
                  <Badge variant="attention">Status unavailable</Badge>
                )
              }
            />
            <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <MarkGithubIcon className="w-5 h-5 mt-0.5 text-ink shrink-0" />
                <p className="text-[13.5px] text-muted max-w-[52ch]">
                  {github === 'connected'
                    ? 'Projust can read the repositories you granted, so you can import them as projects.'
                    : github === 'unknown'
                      ? "We couldn't check your GitHub connection. Refresh the page to try again."
                      : 'Connect GitHub to import your repositories and prove you own them. This is separate from how you sign in.'}
                </p>
              </div>
              {github !== 'connected' && github !== 'checking' && (
                <a href="/api/github/connect" className="pj-btn pj-btn-ghost shrink-0 w-full sm:w-auto">
                  <MarkGithubIcon className="w-4 h-4" />
                  Connect GitHub
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Privacy */}
      {activeTab === 'privacy' && (
        <Card>
          <CardHeader title="Profile visibility" />
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p id="public-label" className="text-[14.5px] font-semibold text-ink">
                  Public profile
                </p>
                <p className="mt-1 text-[13.5px] text-muted max-w-[56ch]">
                  {isPublic ? (
                    <>
                      Anyone with your link can see your verified scores and certificates at{' '}
                      <span className="font-mono text-[12.5px] text-ink-2 break-all">/u/{profile.username}</span>.
                    </>
                  ) : (
                    'Only you can see your profile. Certificate links you share still work.'
                  )}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                aria-labelledby="public-label"
                disabled={loading || privacyStatus === 'saving'}
                onClick={togglePublic}
                className={cn(
                  'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 disabled:opacity-50',
                  isPublic ? 'bg-olive border-olive' : 'bg-paper border-line-2'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-5 w-5 rounded-full bg-sheet shadow-sm transition-transform duration-200 ease-land',
                    isPublic ? 'translate-x-[22px]' : 'translate-x-[3px]'
                  )}
                />
              </button>
            </div>
            <StatusLine status={privacyStatus} message={privacyMessage} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FormField({
  id,
  label,
  hint,
  error,
  count,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  count?: { value: number; max: number };
  children: React.ReactNode;
}) {
  const over = count ? count.value > count.max : false;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <label htmlFor={id} className="text-[13.5px] font-medium text-ink">
          {label}
        </label>
        {count && (
          <span className={cn('text-[12px] tabular-nums', over ? 'text-warn' : 'text-muted')}>
            {count.value}/{count.max}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[12.5px] text-warn">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-[12.5px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function StatusLine({ status, message }: { status: SaveStatus; message: string | null }) {
  if (!message || status === 'idle' || status === 'saving') return null;
  const ok = status === 'saved';
  return (
    <p
      role="status"
      className={cn(
        'flex items-start gap-1.5 text-[13px]',
        ok ? 'text-pass' : status === 'blocked' ? 'text-ink-2' : 'text-warn'
      )}
    >
      {ok ? <CheckIcon className="w-4 h-4 mt-px shrink-0" /> : <AlertIcon className="w-4 h-4 mt-px shrink-0" />}
      <span>{message}</span>
    </p>
  );
}

function Notice({ tone, children }: { tone: 'info' | 'error'; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'note'}
      className={cn(
        'flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[13.5px]',
        tone === 'error' ? 'bg-[#FDECEC] border-[#F5CFCF] text-[#B4232C]' : 'bg-lime-soft border-[#DCEB9E] text-ink-2'
      )}
    >
      <AlertIcon className="w-4 h-4 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
