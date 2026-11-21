'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { Volume2, VolumeX } from 'lucide-react';
import { ConceptExplainer, explainerCues, explainerDuration, type ExplainerProps } from './ConceptExplainer';
import { CertificateReveal, CERT_REVEAL_FRAMES, certificateCues, type CertificateRevealProps } from './CertificateReveal';
import { V } from './theme';

/**
 * In-browser Remotion players (no server rendering). Loaded lazily by VideoButton so the
 * Remotion code only downloads when someone opens a video.
 *
 * Music and sound effects are part of the video. The voice-over uses the browser's built-in
 * speech (Web Speech API): free, offline-capable, no AI call. It follows the player: each
 * scene's line starts when that scene starts, stops on pause/mute, and resyncs after a seek.
 */
type Cue = { from: number; text: string };

const playerStyle: React.CSSProperties = { width: '100%', aspectRatio: '16 / 9', borderRadius: 14, overflow: 'hidden' };

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  const prefer = [/natural/i, /neural/i, /premium/i, /enhanced/i, /google us english/i, /samantha/i, /daniel/i, /karen/i, /google uk english/i];
  for (const re of prefer) {
    const v = voices.find((x) => re.test(x.name));
    if (v) return (cachedVoice = v);
  }
  const v = voices.find((x) => x.default) || voices[0] || null;
  if (v) cachedVoice = v;
  return v;
}

/** Split into sentences: Chrome cuts off long utterances, and short ones resync better. */
const sentences = (text: string) => text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];

function useNarration(ref: React.RefObject<PlayerRef>, cues: Cue[], enabled: boolean) {
  const cuesRef = useRef(cues);
  cuesRef.current = cues;

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const player = ref.current;
    if (!player) return;
    if (!enabled) {
      synth.cancel();
      return;
    }
    let spoken = -1;
    let muted = false;

    const cueAt = (frame: number) => {
      const list = cuesRef.current;
      let idx = -1;
      for (let i = 0; i < list.length; i++) if (frame >= list[i].from) idx = i;
      return idx;
    };
    const speak = (idx: number) => {
      synth.cancel();
      spoken = idx;
      if (idx < 0 || muted) return;
      const v = pickVoice();
      const rate = 1;
      const volume = Math.min(1, Math.max(0, player.getVolume?.() ?? 1));
      for (const part of sentences(cuesRef.current[idx].text)) {
        const u = new SpeechSynthesisUtterance(part);
        if (v) {
          u.voice = v;
          u.lang = v.lang;
        }
        u.rate = rate;
        u.pitch = 1.0;
        u.volume = volume;
        synth.speak(u);
      }
    };

    const onFrame = (e: { detail: { frame: number } }) => {
      if (!player.isPlaying()) return;
      const idx = cueAt(e.detail.frame);
      // Speak when a new scene starts (within ~1 s of its start, so seeking mid-scene stays quiet)
      if (idx !== spoken && idx >= 0 && e.detail.frame - cuesRef.current[idx].from < 30) speak(idx);
      else if (idx !== spoken) spoken = idx;
    };
    const onPlay = () => {
      const idx = cueAt(player.getCurrentFrame());
      if (idx >= 0 && player.getCurrentFrame() - cuesRef.current[idx].from < 30) speak(idx);
      else spoken = idx;
    };
    const stop = () => {
      synth.cancel();
    };
    const onSeek = () => {
      synth.cancel();
      spoken = -2; // force a re-check on the next frame
    };
    const onMute = (e: { detail: { isMuted: boolean } }) => {
      muted = e.detail.isMuted;
      if (muted) synth.cancel();
    };

    // Voices load asynchronously in some browsers
    const onVoices = () => {
      cachedVoice = null;
      pickVoice();
    };
    synth.getVoices();
    synth.addEventListener?.('voiceschanged', onVoices);
    player.addEventListener('frameupdate', onFrame);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', stop);
    player.addEventListener('ended', stop);
    player.addEventListener('seeked', onSeek);
    player.addEventListener('mutechange', onMute);
    if (player.isPlaying()) onPlay();
    return () => {
      player.removeEventListener('frameupdate', onFrame);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', stop);
      player.removeEventListener('ended', stop);
      player.removeEventListener('seeked', onSeek);
      player.removeEventListener('mutechange', onMute);
      synth.removeEventListener?.('voiceschanged', onVoices);
      synth.cancel();
    };
  }, [ref, enabled]);
}

function VoiceToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-line bg-sheet text-[13px] text-ink hover:border-ink/40 cursor-pointer"
    >
      {on ? <Volume2 className="w-3.5 h-3.5" aria-hidden /> : <VolumeX className="w-3.5 h-3.5" aria-hidden />}
      Voice {on ? 'on' : 'off'}
    </button>
  );
}

function usePersistentVoice() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    try {
      if (window.localStorage.getItem('pj-video-voice') === 'off') setOn(false);
    } catch {
      // storage may be blocked; default stays on
    }
  }, []);
  const set = (v: boolean) => {
    setOn(v);
    try {
      window.localStorage.setItem('pj-video-voice', v ? 'on' : 'off');
    } catch {
      // ignore
    }
  };
  return [on, set] as const;
}

function Shell({ voice, setVoice, children }: { voice: boolean; setVoice: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      {children}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-muted">
        <span>Music dips while the voice talks. The voice is your browser&rsquo;s built-in speech.</span>
        <VoiceToggle on={voice} onChange={setVoice} />
      </div>
    </div>
  );
}

export function ExplainerPlayer({ video }: { video: ExplainerProps }) {
  const ref = useRef<PlayerRef>(null);
  const [voice, setVoice] = usePersistentVoice();
  useNarration(ref, explainerCues(video), voice);
  return (
    <Shell voice={voice} setVoice={setVoice}>
      <Player
        ref={ref}
        component={ConceptExplainer}
        inputProps={video}
        durationInFrames={explainerDuration(video)}
        compositionWidth={V.width}
        compositionHeight={V.height}
        fps={V.fps}
        controls
        autoPlay
        clickToPlay
        allowFullscreen
        spaceKeyToPlayOrPause
        showVolumeControls
        acknowledgeRemotionLicense
        style={playerStyle}
      />
    </Shell>
  );
}

export function CertificatePlayer({ video }: { video: CertificateRevealProps }) {
  const ref = useRef<PlayerRef>(null);
  const [voice, setVoice] = usePersistentVoice();
  useNarration(ref, certificateCues(video), voice);
  return (
    <Shell voice={voice} setVoice={setVoice}>
      <Player
        ref={ref}
        component={CertificateReveal}
        inputProps={video}
        durationInFrames={CERT_REVEAL_FRAMES}
        compositionWidth={V.width}
        compositionHeight={V.height}
        fps={V.fps}
        controls
        autoPlay
        clickToPlay
        allowFullscreen
        spaceKeyToPlayOrPause
        showVolumeControls
        acknowledgeRemotionLicense
        style={playerStyle}
      />
    </Shell>
  );
}
