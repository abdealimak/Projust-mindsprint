import React from 'react';
import { Html5Audio, Sequence, interpolate } from 'remotion';

/**
 * Sound for the videos. All files are synthesized by scripts/make-video-audio.py (original,
 * no licences) and served from public/video-audio.
 */
export const SFX = {
  bed: '/video-audio/bed.mp3',
  whoosh: '/video-audio/whoosh.mp3',
  tick: '/video-audio/tick.mp3',
  pop: '/video-audio/pop.mp3',
  stamp: '/video-audio/stamp.mp3',
  chime: '/video-audio/chime.mp3',
  riser: '/video-audio/riser.mp3',
} as const;

/** Narration pace used to size scenes so the voice fits (≈2.6 words per second). */
export const FRAMES_PER_WORD = 11.5;
export const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Length of bed.mp3 in frames at 30 fps (16 s loop). Keep in sync with the script. */
const BED_FRAMES = 480;
/** Overlap between bed copies, so MP3 encoder padding never leaves a gap at the loop point. */
const BED_XFADE = 12;

/** A one-shot sound effect at a frame (relative to the enclosing Sequence). */
export const Sfx: React.FC<{ src: string; at: number; volume?: number; frames?: number }> = ({ src, at, volume = 0.6, frames = 60 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={frames} layout="none">
    <Html5Audio src={src} volume={volume} />
  </Sequence>
);

type Cue = { from: number; text: string };

/** Frame ranges where the voice is talking, from the narration cues. */
export function speechRanges(cues: Cue[]): Array<[number, number]> {
  return cues.map((c) => [c.from, c.from + Math.ceil(wordCount(c.text) * FRAMES_PER_WORD)]);
}

/** 0..1 how much to duck at a frame: smooth 8-frame ramps around each spoken range. */
function duckAmount(f: number, ranges: Array<[number, number]>) {
  let d = 0;
  for (const [a, b] of ranges) {
    const v = interpolate(f, [a - 8, a, b, b + 14], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    if (v > d) d = v;
  }
  return d;
}

/**
 * Music bed that fades in and out and dips under the narration. Instead of `loop` (which
 * clicks on MP3 padding), copies of the loop are laid end to end with a short crossfade.
 */
export const MusicBed: React.FC<{ total: number; volume?: number; cues?: Cue[]; duckTo?: number }> = ({
  total,
  volume = 0.18,
  cues = [],
  duckTo = 0.45,
}) => {
  const ranges = speechRanges(cues);
  const step = BED_FRAMES - BED_XFADE;
  const copies = Math.ceil(total / step);
  return (
    <>
      {Array.from({ length: copies }, (_, i) => {
        const start = i * step;
        const len = Math.min(BED_FRAMES, total - start);
        return (
          <Sequence key={i} from={start} durationInFrames={len} layout="none">
            <Html5Audio
              src={SFX.bed}
              volume={(local) => {
                const f = start + local;
                const master = interpolate(f, [0, 25, total - 35, total], [0, volume, volume, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const xin = i === 0 ? 1 : Math.min(1, local / BED_XFADE);
                const xout = start + BED_FRAMES >= total ? 1 : Math.min(1, (BED_FRAMES - local) / BED_XFADE);
                const duck = 1 - (1 - duckTo) * duckAmount(f, ranges);
                return master * Math.sqrt(xin * xout) * duck;
              }}
            />
          </Sequence>
        );
      })}
    </>
  );
};
