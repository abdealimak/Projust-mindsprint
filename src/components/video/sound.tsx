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

/** A one-shot sound effect at a frame (relative to the enclosing Sequence). */
export const Sfx: React.FC<{ src: string; at: number; volume?: number; frames?: number }> = ({ src, at, volume = 0.6, frames = 60 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={frames} layout="none">
    <Html5Audio src={src} volume={volume} />
  </Sequence>
);

/** Looping music bed that fades in and out, kept low under the narration. */
export const MusicBed: React.FC<{ total: number; volume?: number }> = ({ total, volume = 0.16 }) => (
  <Html5Audio
    src={SFX.bed}
    loop
    volume={(f) =>
      interpolate(f, [0, 25, total - 35, total], [0, volume, volume, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    }
  />
);
