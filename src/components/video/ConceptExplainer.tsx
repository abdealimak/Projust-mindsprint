import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { fade } from '@remotion/transitions/fade';
import { langFromPath, tokenize } from '@/components/project/highlight';
import { TOKEN_COLOR, V } from './theme';
import { FRAMES_PER_WORD, MusicBed, SFX, Sfx, wordCount } from './sound';

/**
 * A short animated explainer for one concept or lesson, built only from data the app already
 * has (no AI call): title → the idea → the cited code, highlighted line by line → what it
 * builds on and leads to → a question to check yourself. Scenes are sized so the narration
 * (read by the browser's voice, see players.tsx) fits.
 */
export type ExplainerProps = {
  /** Small label above the title, e.g. "Security · Intro" or "Lesson 3 · 6 min". */
  kicker: string;
  title: string;
  summary: string;
  repo?: string | null;
  code?: { path: string; startLine: number; text: string } | null;
  buildsOn?: string[];
  leadsTo?: string[];
  question?: string | null;
};

type SceneKey = 'intro' | 'idea' | 'code' | 'links' | 'outro';
const MAX_CODE_LINES = 12;
const T = 16; // transition length in frames
const LINE_STEP = 20; // frames per highlighted code line

const DEFAULT_Q = 'Open the cited lines and ask yourself: what would break if this code were removed?';

const fileName = (p: string) => p.split('/').pop() || p;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** What the voice says in each scene. */
export function explainerNarration(p: ExplainerProps): Record<SceneKey, string> {
  const lines = p.code ? Math.min(MAX_CODE_LINES, p.code.text.split('\n').length) : 0;
  const b = (p.buildsOn || []).slice(0, 3);
  const l = (p.leadsTo || []).slice(0, 3);
  return {
    intro: `${p.title}.`,
    idea: p.summary,
    code: p.code
      ? `Here it is in ${fileName(p.code.path)}, lines ${p.code.startLine} to ${p.code.startLine + lines - 1}. Follow the highlight.`
      : '',
    links: [b.length ? `It builds on ${list(b)}.` : 'It is a starting point.', l.length ? `And it leads to ${list(l)}.` : ''].join(' ').trim(),
    outro: `Check yourself. ${p.question || DEFAULT_Q}`,
  };
}

/** Scene order, lengths and start frames (transitions overlap scenes by T frames). */
export function explainerTimeline(p: ExplainerProps) {
  const say = explainerNarration(p);
  const fit = (min: number, text: string, pad = 30) => Math.max(min, Math.ceil(wordCount(text) * FRAMES_PER_WORD) + pad);
  const codeLines = p.code ? Math.min(MAX_CODE_LINES, p.code.text.split('\n').length) : 0;
  const raw: { key: SceneKey; frames: number }[] = [
    { key: 'intro', frames: fit(100, say.intro, 50) },
    { key: 'idea', frames: fit(150, say.idea, 45) },
  ];
  if (codeLines > 0) raw.push({ key: 'code', frames: Math.max(fit(120, say.code), 70 + codeLines * LINE_STEP + 40) });
  if ((p.buildsOn?.length || 0) + (p.leadsTo?.length || 0) > 0) raw.push({ key: 'links', frames: fit(170, say.links, 50) });
  raw.push({ key: 'outro', frames: fit(150, say.outro, 70) });

  let at = 0;
  const scenes = raw.map((s, i) => {
    const from = i === 0 ? 0 : at - T;
    at = from + s.frames;
    return { ...s, from, text: say[s.key] };
  });
  return { scenes, total: at };
}

export const explainerDuration = (p: ExplainerProps) => explainerTimeline(p).total;

export const ConceptExplainer: React.FC<ExplainerProps> = (props) => {
  const { scenes, total } = explainerTimeline(props);
  return (
    <AbsoluteFill style={{ background: V.paper, color: V.ink, fontFamily: V.sans }}>
      <Backdrop />
      <TransitionSeries>
        {scenes.map((s, i) => (
          <React.Fragment key={s.key}>
            {i > 0 && sceneTransition(i - 1)}
            <TransitionSeries.Sequence durationInFrames={s.frames}>
              {s.key === 'intro' && <Intro {...props} />}
              {s.key === 'idea' && <Idea {...props} />}
              {s.key === 'code' && props.code && <Code code={props.code} />}
              {s.key === 'links' && <Links {...props} />}
              {s.key === 'outro' && <Outro {...props} />}
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
      </TransitionSeries>
      <Brand />
      <ProgressRule total={total} />

      <MusicBed total={total} cues={explainerCues(props)} />
      {scenes.slice(1).map((s) => (
        <Sfx key={s.key} src={SFX.whoosh} at={s.from - 4} volume={0.35} frames={25} />
      ))}
    </AbsoluteFill>
  );
};

/** Cycle slide → wipe → slide up → fade between scenes. */
function sceneTransition(index: number) {
  const timing = linearTiming({ durationInFrames: T, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  switch (index % 4) {
    case 0:
      return <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={timing} />;
    case 1:
      return <TransitionSeries.Transition presentation={wipe({ direction: 'from-left' })} timing={timing} />;
    case 2:
      return <TransitionSeries.Transition presentation={slide({ direction: 'from-bottom' })} timing={timing} />;
    default:
      return <TransitionSeries.Transition presentation={fade()} timing={timing} />;
  }
}

/* ── shared bits ─────────────────────────────────────────────────────────── */

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function useIn(delay = 0, frames = 18) {
  const frame = useCurrentFrame();
  return interpolate(frame - delay, [0, frames], [0, 1], { ...clamp, easing: ease });
}

/** Slowly drifting dot grid and a soft lime glow behind everything. */
const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const x = 900 + Math.sin(frame / 90) * 160;
  const y = 260 + Math.cos(frame / 110) * 120;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${V.line} 1.4px, transparent 1.6px)`,
          backgroundSize: '30px 30px',
          backgroundPosition: `${(frame * 0.25) % 30}px ${(frame * 0.12) % 30}px`,
          opacity: 0.8,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x - 320,
          top: y - 320,
          width: 640,
          height: 640,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(205,235,90,.35) 0%, rgba(205,235,90,0) 65%)',
        }}
      />
    </AbsoluteFill>
  );
};

const Brand: React.FC = () => (
  <div style={{ position: 'absolute', left: 64, top: 44, fontFamily: V.sans, fontWeight: 600, fontSize: 22, letterSpacing: -0.3 }}>
    Projust<sup style={{ fontSize: 12, marginLeft: 1 }}>°</sup>
  </div>
);

const ProgressRule: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  return <div style={{ position: 'absolute', left: 0, bottom: 0, height: 5, width: `${(frame / total) * 100}%`, background: V.olive }} />;
};

const Eyebrow: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const o = useIn(delay, 16);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontFamily: V.mono,
        fontSize: 17,
        letterSpacing: 2.5,
        textTransform: 'uppercase',
        color: V.muted,
        opacity: o,
      }}
    >
      <span style={{ width: 36 * o, height: 1.5, background: V.muted }} />
      {children}
    </div>
  );
};

/* ── scenes ──────────────────────────────────────────────────────────────── */

const Intro: React.FC<ExplainerProps> = ({ kicker, title, repo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = title.split(/\s+/);
  const underline = interpolate(frame, [18 + words.length * 3, 40 + words.length * 3], [0, 1], { ...clamp, easing: ease });
  const repoIn = useIn(30 + words.length * 3);
  const size = title.length > 48 ? 72 : 88;
  return (
    <AbsoluteFill style={{ padding: '0 96px', justifyContent: 'center' }}>
      <Eyebrow>{kicker}</Eyebrow>
      <h1 style={{ fontFamily: V.serif, fontWeight: 400, fontSize: size, lineHeight: 1.04, letterSpacing: -1.5, margin: '26px 0 0', maxWidth: 1060 }}>
        {words.map((w, i) => {
          const s = spring({ frame: frame - 6 - i * 3, fps, config: { damping: 16, stiffness: 120 } });
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                marginRight: '0.24em',
                opacity: Math.min(1, s * 1.2),
                transform: `translateY(${(1 - s) * 50}px) rotate(${(1 - s) * 4}deg)`,
                filter: `blur(${(1 - Math.min(1, s)) * 6}px)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </h1>
      <div style={{ height: 8, width: 220 * underline, background: V.lime, borderRadius: 99, marginTop: 18 }} />
      {repo && (
        <div style={{ marginTop: 26, fontFamily: V.mono, fontSize: 20, color: V.muted, opacity: repoIn, transform: `translateY(${(1 - repoIn) * 10}px)` }}>
          in <span style={{ color: V.ink, background: V.sheet, border: `1px solid ${V.line}`, borderRadius: 8, padding: '3px 10px' }}>{repo}</span>
        </div>
      )}
      <Sfx src={SFX.pop} at={6} volume={0.3} frames={12} />
    </AbsoluteFill>
  );
};

const Idea: React.FC<ExplainerProps> = ({ summary }) => {
  const frame = useCurrentFrame();
  const words = summary.split(/\s+/).filter(Boolean);
  // The three longest words get a lime marker as the voice reaches them
  const keyIdx = new Set(
    words
      .map((w, i) => ({ i, n: w.replace(/[^\w]/g, '').length }))
      .filter((x) => x.n >= 6)
      .sort((a, b) => b.n - a.n)
      .slice(0, 3)
      .map((x) => x.i)
  );
  const spoken = (frame - 10) / FRAMES_PER_WORD;
  return (
    <AbsoluteFill style={{ padding: '0 96px', justifyContent: 'center' }}>
      <Eyebrow>The idea</Eyebrow>
      <p style={{ fontFamily: V.serif, fontSize: words.length > 45 ? 42 : 52, lineHeight: 1.22, margin: '28px 0 0', maxWidth: 1080, letterSpacing: -0.4 }}>
        {words.map((w, i) => {
          const p = interpolate(spoken - i, [-0.2, 0.8], [0, 1], clamp);
          const mark = keyIdx.has(i) ? interpolate(spoken - i, [0.2, 1.4], [0, 100], clamp) : 0;
          return (
            <span key={i}>
              <span
                style={{
                  display: 'inline-block',
                  opacity: 0.16 + p * 0.84,
                  transform: `translateY(${(1 - p) * 8}px)`,
                  backgroundImage: `linear-gradient(${V.lime}, ${V.lime})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: '0 88%',
                  backgroundSize: `${mark}% 34%`,
                }}
              >
                {w}
              </span>{' '}
            </span>
          );
        })}
      </p>
    </AbsoluteFill>
  );
};

const Code: React.FC<{ code: NonNullable<ExplainerProps['code']> }> = ({ code }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const all = code.text.replace(/\t/g, '  ').split('\n');
  const lines = all.slice(0, MAX_CODE_LINES);
  const toks = tokenize(lines.join('\n'), langFromPath(code.path));
  const win = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const revealEnd = 24 + lines.length * 4;
  const walkStart = revealEnd + 14;
  const stepF = interpolate(frame, [walkStart, walkStart + lines.length * LINE_STEP], [0, lines.length], clamp);
  const active = Math.min(Math.floor(stepF), lines.length - 1);
  const band = spring({ frame: frame - walkStart - active * LINE_STEP, fps, config: { damping: 20, stiffness: 180 } });
  const lineH = 34;
  const bandY = 14 + (active - 1 + band) * lineH;
  // Camera: gentle push-in once the walk starts, following the highlight
  const push = interpolate(frame, [walkStart - 10, walkStart + 30], [0, 1], { ...clamp, easing: ease });
  const follow = (active - (lines.length - 1) / 2) * lineH * 0.35 * push;
  const endLine = code.startLine + lines.length - 1;

  return (
    <AbsoluteFill style={{ padding: '100px 96px 70px', justifyContent: 'center', perspective: 1400 }}>
      <Eyebrow>Where it lives in your code</Eyebrow>
      <div
        style={{
          marginTop: 24,
          background: '#fff',
          border: `1px solid ${V.line}`,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: `0 ${30 + push * 20}px 70px -30px rgba(17,17,16,.4)`,
          opacity: Math.min(1, win * 1.3),
          transform: `translateY(${(1 - win) * 60 - follow}px) rotateX(${(1 - win) * 16}deg) scale(${0.96 + win * 0.04 + push * 0.05})`,
          transformOrigin: '50% 40%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 22px', borderBottom: `1px solid ${V.line}`, background: V.sheet, fontFamily: V.mono, fontSize: 17 }}>
          <span style={{ display: 'flex', gap: 7 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 11, height: 11, borderRadius: 99, background: V.line }} />
            ))}
          </span>
          <span style={{ marginLeft: 8, color: V.ink, fontWeight: 600 }}>{code.path}</span>
          <span style={{ color: V.muted }}>
            :{code.startLine}-{endLine}
          </span>
        </div>
        <div style={{ position: 'relative', padding: '14px 0', fontFamily: V.mono, fontSize: 20 }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: Math.max(14, bandY),
              height: lineH,
              background: 'rgba(205,235,90,.5)',
              borderLeft: `4px solid ${V.olive}`,
              opacity: frame >= walkStart ? 1 : 0,
            }}
          />
          {toks.map((row, i) => {
            const shown = interpolate(frame, [20 + i * 4, 32 + i * 4], [0, 100], clamp);
            return (
              <div key={i} style={{ position: 'relative', display: 'flex', height: lineH, alignItems: 'center', whiteSpace: 'pre' }}>
                <span style={{ width: 70, textAlign: 'right', paddingRight: 22, color: i === active && frame >= walkStart ? V.ink : '#A8A39A', flexShrink: 0 }}>
                  {code.startLine + i}
                </span>
                <span style={{ clipPath: `inset(0 ${100 - shown}% 0 0)`, opacity: frame < walkStart || i <= active ? 1 : 0.5 }}>
                  {row.map((t, j) => (
                    <span key={j} style={{ color: TOKEN_COLOR[t.k], fontStyle: t.k === 'com' ? 'italic' : 'normal' }}>
                      {t.t}
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {all.length > MAX_CODE_LINES && (
        <div style={{ marginTop: 12, fontSize: 17, color: V.muted }}>First {MAX_CODE_LINES} lines. Open the file in Projust to read all of it.</div>
      )}
      {lines.map((_, i) => (
        <Sfx key={i} src={SFX.tick} at={walkStart + i * LINE_STEP} volume={0.22} frames={8} />
      ))}
    </AbsoluteFill>
  );
};

const Links: React.FC<ExplainerProps> = ({ title, buildsOn = [], leadsTo = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = buildsOn.slice(0, 3);
  const l = leadsTo.slice(0, 3);
  const center = spring({ frame: frame - 4, fps, config: { damping: 14, stiffness: 110 } });
  const pulse = (Math.sin(frame / 9) + 1) / 2;
  const nodeIn = (i: number, base: number) => spring({ frame: frame - base - i * 6, fps, config: { damping: 16, stiffness: 140 } });
  const draw = (i: number, base: number) => interpolate(frame, [base + i * 6, base + 18 + i * 6], [0, 1], { ...clamp, easing: ease });

  // Layout (composition pixels)
  const cx = 640;
  const cy = 395;
  const colY = (n: number, i: number) => cy + (i - (n - 1) / 2) * 92;
  const leftX = 300;
  const rightX = 980;

  const node = (text: string, x: number, y: number, o: number, align: 'left' | 'right') => (
    <div
      key={`${align}-${text}`}
      style={{
        position: 'absolute',
        top: y - 30,
        [align === 'left' ? 'right' : 'left']: align === 'left' ? 1280 - x : x,
        width: 250,
        fontSize: 19,
        lineHeight: 1.2,
        padding: '10px 14px',
        background: '#fff',
        border: `1px solid ${V.line}`,
        borderRadius: 12,
        opacity: o,
        transform: `scale(${0.85 + o * 0.15})`,
      }}
    >
      {text}
    </div>
  );

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 96, top: 120 }}>
        <Eyebrow>How it connects</Eyebrow>
      </div>
      <div style={{ position: 'absolute', left: 96, top: 170, fontSize: 16, color: V.muted, fontFamily: V.mono }}>Builds on</div>
      <div style={{ position: 'absolute', right: 96, top: 170, fontSize: 16, color: V.muted, fontFamily: V.mono }}>Leads to</div>

      <svg width={1280} height={720} style={{ position: 'absolute', inset: 0 }}>
        {b.map((_, i) => {
          const y = colY(b.length, i);
          const d = `M${leftX} ${y} C ${leftX + 90} ${y}, ${cx - 240} ${cy}, ${cx - 150} ${cy}`;
          return <path key={`b${i}`} d={d} stroke={V.ink} strokeWidth={2} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(i, 14)} />;
        })}
        {l.map((_, i) => {
          const y = colY(l.length, i);
          const d = `M${cx + 150} ${cy} C ${cx + 240} ${cy}, ${rightX - 90} ${y}, ${rightX} ${y}`;
          return <path key={`l${i}`} d={d} stroke={V.ink} strokeWidth={2} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw(i, 44)} />;
        })}
      </svg>

      {b.length === 0 && node('A starting point', leftX, cy, nodeIn(0, 14), 'left')}
      {b.map((t, i) => node(t, leftX, colY(b.length, i), nodeIn(i, 24), 'left'))}
      {l.length === 0 && node('Nothing builds on it yet', rightX, cy, nodeIn(0, 44), 'right')}
      {l.map((t, i) => node(t, rightX, colY(l.length, i), nodeIn(i, 54), 'right'))}

      <div
        style={{
          position: 'absolute',
          left: cx - 150,
          top: cy - 64,
          width: 300,
          height: 128,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 20px',
          background: V.ink,
          color: V.paper,
          borderRadius: 18,
          fontFamily: V.serif,
          fontSize: title.length > 40 ? 26 : 31,
          lineHeight: 1.1,
          opacity: center,
          transform: `scale(${0.8 + center * 0.2})`,
          boxShadow: `0 0 0 ${6 + pulse * 8}px rgba(205,235,90,${0.35 - pulse * 0.2})`,
        }}
      >
        {title}
      </div>

      <Sfx src={SFX.pop} at={4} volume={0.35} frames={12} />
      {[...b, ...l].map((_, i) => (
        <Sfx key={i} src={SFX.pop} at={(i < b.length ? 24 + i * 6 : 54 + (i - b.length) * 6)} volume={0.2} frames={10} />
      ))}
    </AbsoluteFill>
  );
};

const Outro: React.FC<ExplainerProps> = ({ question }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 120 } });
  const q = question || DEFAULT_Q;
  const sub = useIn(50);
  return (
    <AbsoluteFill style={{ padding: '0 96px', justifyContent: 'center' }}>
      <Eyebrow>Check yourself</Eyebrow>
      <div style={{ position: 'relative', marginTop: 28, maxWidth: 1040 }}>
        <Burst frame={frame - 8} />
        <div
          style={{
            position: 'relative',
            padding: '34px 40px',
            background: V.lime,
            borderRadius: 24,
            transform: `scale(${0.86 + pop * 0.14}) rotate(${(1 - pop) * -3}deg)`,
            opacity: Math.min(1, pop * 1.4),
          }}
        >
          <p style={{ fontFamily: V.serif, fontSize: q.length > 110 ? 40 : 50, lineHeight: 1.15, margin: 0 }}>{q}</p>
        </div>
      </div>
      <div style={{ marginTop: 26, fontSize: 21, color: V.muted, opacity: sub }}>The quiz asks questions like this about your own code.</div>
      <Sfx src={SFX.chime} at={8} volume={0.4} frames={50} />
    </AbsoluteFill>
  );
};

/** A small burst of dots from behind a card. */
const Burst: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 0) return null;
  const p = interpolate(frame, [0, 34], [0, 1], { ...clamp, easing: ease });
  const colors = [V.olive, V.orange, V.sky, V.ink, V.lime];
  return (
    <>
      {Array.from({ length: 18 }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const r = 120 + (i % 3) * 60;
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 10,
              height: 10,
              borderRadius: i % 2 ? 99 : 2,
              background: colors[i % colors.length],
              opacity: 1 - p,
              transform: `translate(${Math.cos(a) * r * 2.2 * p}px, ${Math.sin(a) * r * p}px) rotate(${p * 200}deg)`,
            }}
          />
        );
      })}
    </>
  );
};

/** Start frame of each scene (for syncing narration). */
export function explainerCues(p: ExplainerProps) {
  return explainerTimeline(p)
    .scenes.filter((s) => s.text)
    .map((s) => ({ from: s.from + (s.key === 'intro' ? 8 : 6), text: s.text }));
}
