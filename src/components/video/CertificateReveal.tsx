import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ASPECTS, ASPECT_LABELS, type AspectScores } from '@/types/learning';
import { V } from './theme';
import { MusicBed, SFX, Sfx } from './sound';

/** ~10 s shareable reveal of a certificate: paper lands, scores fill, average counts up, seal stamps. */
export type CertificateRevealProps = {
  code: string;
  recipientName: string;
  repo: string;
  commitSha?: string | null;
  level: string;
  scores: AspectScores;
  overall: number;
  sample?: boolean;
};

export const CERT_REVEAL_FRAMES = 330;

/** What the voice says, and when (frames). */
export function certificateCues(p: CertificateRevealProps) {
  const repo = p.repo.replace('/', ' slash ');
  return [
    { from: 14, text: `Certificate of understanding, awarded to ${p.recipientName}, for the code in ${repo}.` },
    { from: 130, text: `Six skills, scored from quizzes on their own code. Average: ${Math.round(p.overall)}.` },
    { from: 250, text: p.sample ? 'This one is a sample. Real ones are verified by Projust.' : 'Verified by Projust. Anyone with the ID can check it.' },
  ];
}

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const CertificateReveal: React.FC<CertificateRevealProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const land = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const name = interpolate(frame, [22, 46], [0, 1], { ...clamp, easing: ease });
  const avg = Math.round(interpolate(frame, [120, 170], [0, p.overall], { ...clamp, easing: ease }));
  const avgPop = spring({ frame: frame - 165, fps, config: { damping: 10, stiffness: 160 } });
  const stamp = spring({ frame: frame - 172, fps, config: { damping: 11, stiffness: 140 } });
  const idChars = Math.floor(interpolate(frame, [205, 250], [0, p.code.length], clamp));
  const footer = interpolate(frame, [255, 275], [0, 1], clamp);

  const camera = interpolate(frame, [0, CERT_REVEAL_FRAMES], [0.93, 1.0], clamp);
  const shine = interpolate(frame, [190, 235], [-40, 140], clamp);

  return (
    <AbsoluteFill style={{ background: V.ink, fontFamily: V.sans, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Spotlight />
      {/* Paper, with a slow camera push */}
      <div style={{ transform: `scale(${camera})` }}>
      <div
        style={{
          width: 1040,
          height: 586,
          background: V.sheet,
          color: V.ink,
          borderRadius: 22,
          padding: '34px 44px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 40px 90px -30px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04)',
          opacity: land,
          transform: `translateY(${(1 - land) * 90}px) rotate(${(1 - land) * -3}deg)`,
        }}
      >
        {/* Light sweep after the seal stamps */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            bottom: -100,
            left: `${shine}%`,
            width: 180,
            background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.75) 50%, rgba(255,255,255,0) 100%)',
            transform: 'skewX(-18deg)',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />
        <div style={{ position: 'absolute', inset: 12, border: `1px solid ${V.line}`, borderRadius: 14, pointerEvents: 'none' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 24, letterSpacing: -0.3 }}>
              Projust<sup style={{ fontSize: 12 }}>°</sup>
            </div>
            <div style={{ marginTop: 6, fontFamily: V.mono, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: V.muted }}>
              Certificate of understanding
              {p.sample && (
                <span style={{ marginLeft: 10, padding: '2px 8px', border: `1px solid ${V.line}`, borderRadius: 99, letterSpacing: 1 }}>Sample</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontFamily: V.mono }}>
            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: V.muted }}>Certificate ID</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, minHeight: 28 }}>
              {p.code.slice(0, idChars)}
              <span style={{ opacity: idChars < p.code.length && frame % 16 < 8 ? 1 : 0 }}>▍</span>
            </div>
          </div>
        </div>

        {/* Recipient + average */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 26 }}>
          <div style={{ opacity: name, transform: `translateY(${(1 - name) * 14}px)` }}>
            <div style={{ fontSize: 15, color: V.muted }}>Awarded to</div>
            <div style={{ fontFamily: V.serif, fontSize: 64, lineHeight: 1, marginTop: 6, letterSpacing: -1 }}>{p.recipientName}</div>
            <div style={{ marginTop: 10, fontSize: 16, color: V.muted }}>
              for understanding the code in <span style={{ fontFamily: V.mono, color: V.ink }}>{p.repo}</span>
              {p.commitSha && (
                <>
                  {' '}at commit <span style={{ fontFamily: V.mono, color: V.ink }}>{p.commitSha.slice(0, 7)}</span>
                </>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                display: 'inline-block',
                background: V.lime,
                borderRadius: 12,
                padding: '4px 16px',
                fontFamily: V.serif,
                fontSize: 76,
                lineHeight: 1,
                transform: `scale(${frame >= 165 ? 1 + (1 - avgPop) * 0.15 : 1})`,
                opacity: frame >= 118 ? 1 : 0,
              }}
            >
              {avg}
            </div>
            <div style={{ fontSize: 14, color: V.muted, marginTop: 6 }}>Average of six skills</div>
          </div>
        </div>

        {/* Scores */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 36, marginTop: 26 }}>
          <Radar scores={p.scores} />
          <div style={{ flex: 1 }}>
            {ASPECTS.map((a, i) => {
              const fill = interpolate(frame, [52 + i * 9, 92 + i * 9], [0, p.scores[a]], { ...clamp, easing: ease });
              return (
                <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 16, height: 30 }}>
                  <span style={{ width: 150, fontSize: 16 }}>{ASPECT_LABELS[a]}</span>
                  <span style={{ flex: 1, height: 6, background: V.line, borderRadius: 99, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fill}%`, background: V.ink, borderRadius: 99 }} />
                    <span style={{ position: 'absolute', left: '40%', top: -4, bottom: -4, width: 2, background: V.orange }} />
                  </span>
                  <span style={{ width: 34, textAlign: 'right', fontFamily: V.mono, fontSize: 16 }}>{Math.round(fill)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer: seal + level */}
        <div style={{ position: 'absolute', left: 44, right: 44, bottom: 30, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative' }}>
            <SealBurst frame={frame - 174} />
            <Seal progress={stamp} visible={frame >= 172} />
          </div>
          <div style={{ opacity: stamp, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ alignSelf: 'flex-start', fontFamily: V.mono, fontSize: 14, background: V.ink, color: V.paper, padding: '4px 12px', borderRadius: 99 }}>
              {p.level}
            </span>
            <span style={{ fontSize: 14, color: V.olive }}>Unlocked: average 60 or more, no skill under 40</span>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 14, color: V.muted, opacity: footer, fontFamily: V.mono }}>
            Verify at projust · /cert/{p.code}
          </div>
        </div>
      </div>
      </div>

      <MusicBed total={CERT_REVEAL_FRAMES} volume={0.14} />
      <Sfx src={SFX.riser} at={0} volume={0.3} frames={45} />
      <Sfx src={SFX.whoosh} at={6} volume={0.4} frames={25} />
      <Sfx src={SFX.pop} at={24} volume={0.3} frames={12} />
      {ASPECTS.map((a, i) => (
        <Sfx key={a} src={SFX.tick} at={52 + i * 9} volume={0.2} frames={8} />
      ))}
      <Sfx src={SFX.chime} at={165} volume={0.4} frames={50} />
      <Sfx src={SFX.stamp} at={174} volume={0.7} frames={20} />
      <Sfx src={SFX.pop} at={205} volume={0.2} frames={12} />
    </AbsoluteFill>
  );
};

/** Soft spotlight and slow drifting specks behind the paper. */
const Spotlight: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 42%, rgba(205,235,90,.16) 0%, rgba(17,17,16,0) 60%)' }} />
      {Array.from({ length: 26 }).map((_, i) => {
        const x = (i * 197) % 1280;
        const y = ((i * 131) % 720) - ((frame * (0.3 + (i % 5) * 0.12)) % 720);
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y < -10 ? y + 730 : y,
              width: 3 + (i % 3),
              height: 3 + (i % 3),
              borderRadius: 99,
              background: i % 4 === 0 ? V.lime : 'rgba(243,241,236,.35)',
              opacity: 0.25 + ((i * 7) % 10) / 20,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Ring of dots that bursts out when the seal stamps. */
const SealBurst: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < 0 || frame > 40) return null;
  const p = interpolate(frame, [0, 40], [0, 1], { ...clamp, easing: ease });
  const colors = [V.lime, V.olive, V.orange, V.sky];
  return (
    <>
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const r = 30 + p * (70 + (i % 3) * 25);
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: 37 + Math.cos(a) * r - 4,
              top: 37 + Math.sin(a) * r - 4,
              width: 8,
              height: 8,
              borderRadius: i % 2 ? 99 : 2,
              background: colors[i % colors.length],
              opacity: 1 - p,
            }}
          />
        );
      })}
    </>
  );
};

const Radar: React.FC<{ scores: AspectScores }> = ({ scores }) => {
  const frame = useCurrentFrame();
  const grow = interpolate(frame, [70, 150], [0, 1], { ...clamp, easing: ease });
  const R = 78;
  const c = 92;
  const pt = (i: number, r: number) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / ASPECTS.length;
    return [c + Math.cos(ang) * r, c + Math.sin(ang) * r];
  };
  const ring = (f: number) => ASPECTS.map((_, i) => pt(i, R * f).join(',')).join(' ');
  const shape = ASPECTS.map((a, i) => pt(i, (R * scores[a] * grow) / 100).join(',')).join(' ');
  return (
    <svg width={184} height={184} viewBox="0 0 184 184" style={{ flexShrink: 0 }}>
      {[1, 0.66, 0.33].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke={V.line} strokeWidth={1} />
      ))}
      <polygon points={ring(0.4)} fill="none" stroke={V.orange} strokeWidth={1.2} strokeDasharray="3 3" />
      {ASPECTS.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke={V.line} strokeWidth={1} />;
      })}
      <polygon points={shape} fill="rgba(205,235,90,.6)" stroke={V.ink} strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
};

const Seal: React.FC<{ progress: number; visible: boolean }> = ({ progress, visible }) => {
  const scale = visible ? 1.8 - progress * 0.8 : 1.8;
  return (
    <svg
      width={74}
      height={74}
      viewBox="0 0 74 74"
      style={{ opacity: visible ? Math.min(1, progress * 1.6) : 0, transform: `scale(${scale}) rotate(${(1 - progress) * -25}deg)` }}
    >
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i * Math.PI * 2) / 24;
        return <circle key={i} cx={37 + Math.cos(a) * 31} cy={37 + Math.sin(a) * 31} r={6} fill={V.olive} />;
      })}
      <circle cx={37} cy={37} r={31} fill={V.olive} />
      <circle cx={37} cy={37} r={24} fill="none" stroke={V.lime} strokeWidth={1.4} />
      <path d="M26 38 L34 46 L49 29" stroke={V.lime} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
