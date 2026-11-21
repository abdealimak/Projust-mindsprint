'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Link2 } from 'lucide-react';
import { create as createQr } from 'qrcode';
import { ProjustLogo } from '@/components/ui/Logo';
import {
  ASPECTS,
  ASPECT_LABELS,
  UNLOCK_AVERAGE,
  UNLOCK_FLOOR,
  type LearningCertificate,
} from '@/types/learning';

/** Dates on a certificate, always in UTC so server and browser render the same day. */
export const fmtCertDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Copies the current page URL (or `url`). Shows "Link copied" for a moment instead of an alert. */
export function CopyLinkButton({ className, url }: { className?: string; url?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    const link = url ?? window.location.href.split('#')[0];
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard API blocked: fall back to a hidden textarea.
      const ta = document.createElement('textarea');
      ta.value = link;
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

/** Small form that opens /cert/<CODE> for another certificate ID. `tone="dark"` matches the landing's dark band. */
export function VerifyForm({ initial = '', tone = 'light' }: { initial?: string; tone?: 'light' | 'dark' }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const dark = tone === 'dark';

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
      <label htmlFor="verify-code" className={`block text-[14px] font-medium ${dark ? 'text-[#D6D1C7]' : ''}`}>
        Check another certificate ID
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
          className={
            dark
              ? 'h-12 flex-1 min-w-0 rounded-full border border-[#3A3936] bg-[#1B1B1A] px-[18px] font-mono text-[14px] tracking-[.04em] uppercase text-[#F3F1EC] placeholder:normal-case placeholder:text-[#8E8A83] transition-colors hover:border-[#57554F] aria-[invalid=true]:border-[#FF9B8F] focus-visible:rounded-full'
              : 'h-11 flex-1 min-w-0 rounded-full border border-line bg-sheet px-4 font-mono text-[14px] uppercase placeholder:normal-case placeholder:text-muted transition-colors hover:border-line-2 focus-visible:rounded-full'
          }
        />
        <button
          type="submit"
          className={dark ? 'pj-btn h-12 !bg-lime !border-lime !text-ink' : 'pj-btn pj-btn-ghost h-11'}
        >
          Verify
        </button>
      </div>
      {error && (
        <p id="verify-code-error" className={`mt-2 text-[13px] ${dark ? 'text-[#FF9B8F]' : 'text-warn'}`}>
          {error}
        </p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------------------------------------
 * The certificate paper. Same layout, type and details as the certificate on the landing page
 * (public/landing.html, #paper), so the product reads as one site. Styles are scoped under .pjc.
 * ---------------------------------------------------------------------------------------------- */

const PAPER_CSS = `
.pjc{container-type:inline-size}
.pjc-paper{position:relative;isolation:isolate;border-radius:22px;background:var(--paper);color:var(--ink);padding:34px 40px 28px;overflow:hidden;text-align:left}
.pjc-dark .pjc-paper{box-shadow:0 50px 100px -30px rgba(0,0,0,.7)}
.pjc-light .pjc-paper{border:1px solid var(--line);box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 30px 60px -34px rgba(30,25,15,.35),0 2px 6px rgba(30,25,15,.05)}
.pjc-paper::before,.pjc-paper::after{content:"";position:absolute;pointer-events:none}
.pjc-paper::before{inset:10px;border:1px solid var(--line-2);border-radius:14px}
.pjc-paper::after{inset:14px;border:1px solid var(--line);border-radius:11px}
.pjc-engr{position:absolute;inset:0;z-index:-1;pointer-events:none;background:repeating-radial-gradient(circle at 106% -8%,transparent 0 8px,rgba(74,90,30,.07) 8px 9px),repeating-radial-gradient(circle at -6% 110%,transparent 0 8px,rgba(74,90,30,.06) 8px 9px);-webkit-mask-image:linear-gradient(45deg,#000,transparent 32%,transparent 68%,#000);mask-image:linear-gradient(45deg,#000,transparent 32%,transparent 68%,#000)}
.pjc-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.pjc-brand{display:flex;flex-direction:column;gap:7px}
.pjc-kind,.pjc-id{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0}
.pjc-id{text-align:right}
.pjc-id b{display:block;color:var(--ink);font-weight:500;font-size:15px;letter-spacing:.04em;text-transform:none;margin-top:4px}
.pjc-tag{display:inline-block;margin-left:8px;vertical-align:1px;font-size:10px;letter-spacing:.08em;padding:2px 8px;border-radius:999px;border:1px solid var(--line-2);color:var(--muted)}
.pjc-tag.ok{border-color:#CFE6AE;background:#E6F5D0;color:#3F6212}
.pjc-who{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 28px;align-items:end;margin-top:20px;padding-top:20px;border-top:1px solid var(--line)}
.pjc-lab{font-size:12.5px;color:var(--muted);margin:0}
.pjc-name{font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:clamp(40px,8cqi,60px);line-height:.95;letter-spacing:-.02em;margin:6px 0 0;overflow-wrap:anywhere}
.pjc-proj{color:var(--muted);font-size:14px;margin:12px 0 0;overflow-wrap:anywhere}
.pjc-proj code{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12.5px;color:var(--ink)}
.pjc-avg{text-align:right;margin:0}
.pjc-avg b{display:inline-block;font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:64px;line-height:.9;letter-spacing:-.02em;padding:2px 8px 0;border-radius:8px;background:var(--lime);font-variant-numeric:tabular-nums}
.pjc-avg small{display:block;font-size:12.5px;color:var(--muted);margin-top:8px}
.pjc-score{display:grid;grid-template-columns:150px minmax(0,1fr);gap:32px;align-items:center;margin-top:20px}
.pjc-score svg{width:150px;height:150px;display:block}
.pjc-sk{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
.pjc-sk li{display:grid;grid-template-columns:116px minmax(0,1fr) 28px;align-items:center;gap:14px;font-size:13.5px;color:var(--ink-2)}
.pjc-t{position:relative;height:5px;border-radius:5px;background:var(--line)}
.pjc-t i{position:absolute;left:0;top:0;bottom:0;border-radius:5px;background:var(--ink)}
.pjc-t i.low{background:var(--red)}
.pjc-t::after{content:"";position:absolute;top:-3px;bottom:-3px;left:var(--floor);width:1.5px;border-radius:1px;background:var(--orange)}
.pjc-n{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12.5px;text-align:right;color:var(--ink);font-variant-numeric:tabular-nums}
.pjc-note{display:flex;align-items:center;gap:8px;margin:10px 0 0;font-size:12px;color:var(--muted)}
.pjc-note i{width:1.5px;height:11px;border-radius:1px;background:var(--orange);flex:none}
.pjc-con{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:20px 0 0;padding:0;list-style:none}
.pjc-chip{font-size:12px;padding:4px 9px;border-radius:999px;border:1px solid var(--line);background:var(--white);display:inline-flex;align-items:center;gap:6px}
.pjc-chip i{display:inline-flex;gap:2px}
.pjc-chip i b{width:4px;height:10px;border-radius:2px;background:var(--line-2)}
.pjc-chip i b.f{background:var(--ink)}
.pjc-more{font-size:12px;color:var(--muted)}
.pjc-foot{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center;margin-top:20px;padding-top:16px;border-top:1px dashed var(--line-2)}
.pjc-seal{width:66px;height:66px;color:var(--olive);display:block}
.pjc-badges{display:flex;flex-direction:column;align-items:flex-start;gap:6px;font-size:13px}
.pjc-ok{display:flex;align-items:center;gap:7px}
.pjc-ok svg{width:14px;height:14px;flex:none;color:#3F7F1F}
.pjc-lvl{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11px;padding:4px 10px;border-radius:999px;background:var(--ink);color:var(--bg);display:inline-block}
.pjc-lvl.iv{background:var(--orange);color:var(--ink)}
.pjc-ver{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11px;color:var(--muted)}
.pjc-qr{display:flex;flex-direction:column;align-items:center;gap:5px;text-decoration:none;color:inherit;border-radius:10px;padding:4px;transition:transform .25s var(--ease)}
.pjc-qr:hover{transform:translateY(-2px)}
.pjc-qr svg{width:64px;height:64px;display:block}
.pjc-qr small{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10px;color:var(--muted)}
@container (max-width:520px){
  .pjc-paper{padding:30px 26px 26px}
  .pjc-who{grid-template-columns:minmax(0,1fr)}.pjc-avg{text-align:left;display:flex;align-items:center;gap:12px}.pjc-avg b{font-size:48px}.pjc-avg small{margin-top:0}
  .pjc-score{grid-template-columns:minmax(0,1fr);gap:16px}.pjc-score svg{margin:0 auto}
  .pjc-foot{grid-template-columns:auto minmax(0,1fr)}.pjc-qr{grid-column:1/-1;flex-direction:row;justify-content:flex-start;gap:12px;padding:0}
}
@container (max-width:400px){
  .pjc-paper{padding:26px 22px 22px}.pjc-top{flex-direction:column;gap:12px}.pjc-id{text-align:left}
  .pjc-sk li{grid-template-columns:108px minmax(0,1fr) 26px;gap:10px;font-size:13px}
  .pjc-foot{grid-template-columns:auto minmax(0,1fr)}.pjc-badges{grid-column:1/-1;order:-1}.pjc-qr{grid-column:auto}.pjc-seal{width:60px;height:60px}
}
@media (prefers-reduced-motion:reduce){.pjc-qr{transition:none}.pjc-qr:hover{transform:none}}
`;

const STRENGTH_BARS: Record<LearningCertificate['concepts'][number]['strength'], number> = {
  proficient: 1,
  advanced: 2,
  master: 3,
};

const clamp100 = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/** Point on axis i of the six-skill hexagon, value v (0–100), radius r. Same geometry as the landing radar. */
const hexPt = (i: number, v: number, r = 64) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 3;
  return [+(Math.cos(a) * r * v / 100).toFixed(2), +(Math.sin(a) * r * v / 100).toFixed(2)] as const;
};
const hexPoly = (vals: number[]) => vals.map((v, i) => hexPt(i, v).join(',')).join(' ');

/** Closed polar path r = f(θ), used for the seal's scalloped edge and rosette. */
const polarPath = (f: (a: number) => number, n = 360) => {
  let d = '';
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI * 2;
    const r = f(a);
    d += `${k ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  }
  return `${d}Z`;
};
const SEAL_EDGE = polarPath((a) => 47 + 1.4 * Math.cos(a * 40));
const SEAL_ROSETTE = [0, 1, 2].map((j) => polarPath((a) => 19 + 5 * Math.sin(9 * a + j * 0.7))).join('');

function Seal({ code }: { code: string }) {
  const arcId = `pjc-arc-${useId().replace(/:/g, '')}`;
  return (
    <svg className="pjc-seal" viewBox="-50 -50 100 100" aria-hidden>
      <defs>
        <path id={arcId} d="M0 -36.5a36.5 36.5 0 1 1 -.01 0" />
      </defs>
      <path d={SEAL_EDGE} fill="none" stroke="currentColor" />
      <circle r="42.5" fill="none" stroke="currentColor" strokeWidth=".8" />
      <circle r="30.5" fill="none" stroke="currentColor" strokeWidth=".8" />
      <text fontFamily="JetBrains Mono, monospace" fontSize="6.2" fill="currentColor">
        <textPath href={`#${arcId}`} textLength="226" lengthAdjust="spacing">
          {`VERIFIED BY PROJUST · ${code} ·`}
        </textPath>
      </text>
      <path d={SEAL_ROSETTE} fill="none" stroke="currentColor" strokeWidth=".45" opacity=".8" />
      <circle r="10" fill="currentColor" />
      <path d="M-4.2 .3l2.9 2.9 5.6-6" fill="none" stroke="#FBFAF7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniRadar({ values }: { values: number[] }) {
  return (
    <svg viewBox="-80 -80 160 160" aria-hidden>
      {[25, 50, 75].map((l) => (
        <polygon key={l} points={hexPoly(Array(6).fill(l))} fill="none" stroke="#E3DFD7" />
      ))}
      <polygon points={hexPoly(Array(6).fill(100))} fill="none" stroke="#D6D1C7" />
      {values.map((_, i) => {
        const [x, y] = hexPt(i, 100);
        return <line key={i} x1="0" y1="0" x2={x} y2={y} stroke="#E3DFD7" />;
      })}
      <polygon points={hexPoly(Array(6).fill(UNLOCK_FLOOR))} fill="none" stroke="#FF7A3D" strokeDasharray="2 2.5" />
      <polygon points={hexPoly(values)} fill="rgba(205,235,90,.55)" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
      {values.map((v, i) => {
        const [x, y] = hexPt(i, v);
        return <circle key={i} cx={x} cy={y} r="2.4" fill="#111" />;
      })}
    </svg>
  );
}

/** Real QR code for `url`, drawn as one SVG path (null if the URL cannot be encoded). */
function QrCode({ url }: { url: string }) {
  const qr = useMemo(() => {
    try {
      const { modules } = createQr(url, { errorCorrectionLevel: 'M' });
      const n = modules.size;
      let d = '';
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.data[y * n + x]) d += `M${x} ${y}h1v1h-1z`;
      return { n, d };
    } catch {
      return null;
    }
  }, [url]);
  if (!qr) return null;
  return (
    <svg viewBox={`0 0 ${qr.n} ${qr.n}`} shapeRendering="crispEdges" aria-hidden>
      <path d={qr.d} fill="#111110" />
    </svg>
  );
}

/**
 * The credential itself. `verifyUrl` is the absolute public URL the QR code points to.
 * `tone` picks the shadow: "dark" when it sits on the dark band (public page), "light" inside the app.
 */
export function CertificatePaper({
  cert,
  verifyUrl,
  tone = 'dark',
  nameAs: NameTag = 'h1',
  className,
}: {
  cert: LearningCertificate;
  verifyUrl: string;
  tone?: 'dark' | 'light';
  /** Heading level for the recipient's name: h1 on the public page, lower inside the app. */
  nameAs?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  const values = ASPECTS.map((a) => clamp100(cert.scores[a] ?? 0));
  const avg = clamp100(cert.overall);
  const sha = cert.commit_sha ? cert.commit_sha.slice(0, 7) : null;
  const shown = cert.concepts.slice(0, 6);
  const more = cert.concepts.length - shown.length;
  const interview = /interview/i.test(cert.level);

  return (
    <div className={`pjc ${tone === 'dark' ? 'pjc-dark' : 'pjc-light'} ${className ?? ''}`}>
      <style dangerouslySetInnerHTML={{ __html: PAPER_CSS }} />
      <article className="pjc-paper" aria-label={`${cert.sample ? 'Sample certificate' : 'Certificate'} ${cert.code}`}>
        <span className="pjc-engr" aria-hidden />
        <div className="pjc-top">
          <div className="pjc-brand">
            <ProjustLogo className="text-[19px]" />
            <p className="pjc-kind">
              Certificate of understanding
              {cert.sample ? <span className="pjc-tag">Sample</span> : <span className="pjc-tag ok">Valid</span>}
            </p>
          </div>
          <p className="pjc-id">
            Certificate ID<b>{cert.code}</b>
          </p>
        </div>

        <div className="pjc-who">
          <div>
            <p className="pjc-lab">Awarded to</p>
            <NameTag className="pjc-name">{cert.recipient_name}</NameTag>
            <p className="pjc-proj">
              for understanding the code in <code>{cert.repo_full_name}</code>
              {sha && (
                <>
                  {' '}at commit <code>{sha}</code>
                </>
              )}
            </p>
          </div>
          <p className="pjc-avg">
            <b>{avg}</b>
            <small>Average of six skills</small>
          </p>
        </div>

        <div className="pjc-score">
          <MiniRadar values={values} />
          <div>
            <ul className="pjc-sk" aria-label="Skill scores out of 100">
              {ASPECTS.map((a, i) => (
                <li key={a}>
                  <span>{ASPECT_LABELS[a]}</span>
                  <span className="pjc-t" style={{ ['--floor' as string]: `${UNLOCK_FLOOR}%` }} aria-hidden>
                    <i className={values[i] < UNLOCK_FLOOR ? 'low' : undefined} style={{ width: `${values[i]}%` }} />
                  </span>
                  <span className="pjc-n">{values[i]}</span>
                </li>
              ))}
            </ul>
            <p className="pjc-note">
              <i aria-hidden />
              Floor of {UNLOCK_FLOOR} on every skill. Unlocks at an average of {UNLOCK_AVERAGE}.
            </p>
          </div>
        </div>

        {shown.length > 0 && (
          <ul className="pjc-con" aria-label="Concepts mastered">
            <li className="pjc-lab" aria-hidden>
              Concepts mastered
            </li>
            {shown.map((c) => (
              <li key={c.name} className="pjc-chip" title={`${c.category}, ${c.strength}`}>
                {c.name}
                <i aria-label={c.strength}>
                  {[1, 2, 3].map((n) => (
                    <b key={n} className={n <= STRENGTH_BARS[c.strength] ? 'f' : undefined} />
                  ))}
                </i>
              </li>
            ))}
            {more > 0 && <li className="pjc-more">and {more} more</li>}
          </ul>
        )}

        <div className="pjc-foot">
          <Seal code={cert.code} />
          <div className="pjc-badges">
            <span className={`pjc-lvl${interview ? ' iv' : ''}`}>{cert.level}</span>
            {cert.ownership_pct != null && (
              <span className="pjc-ok">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="8" cy="8" r="6.5" />
                  <path d="M5.2 8.2l1.9 1.9 3.7-4" />
                </svg>
                Repo ownership verified, {Math.round(cert.ownership_pct)}% of commits
              </span>
            )}
            <span className="pjc-ver">
              v{cert.version}, {cert.version > 1 ? 'updated' : 'issued'} {fmtCertDate(cert.version > 1 ? cert.updated_at : cert.issued_at)}
            </span>
          </div>
          <a className="pjc-qr" href={verifyUrl} aria-label={`Verify certificate ${cert.code}`}>
            <QrCode url={verifyUrl} />
            <small>Scan to verify</small>
          </a>
        </div>
      </article>
    </div>
  );
}
