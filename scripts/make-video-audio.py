"""Synthesize the music bed and sound effects for the Remotion videos.

Everything here is generated from scratch (sine/triangle tones and filtered noise), so the
files are original and free to use. Output: public/video-audio/*.mp3 (needs ffmpeg).

    python3 scripts/make-video-audio.py
"""
import os
import subprocess
import tempfile
import wave

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'video-audio')
rng = np.random.default_rng(7)


def t(sec):
    return np.arange(int(SR * sec)) / SR


def env(n, a=0.01, r=0.2, sustain=1.0):
    """Linear attack, hold, exponential-ish release over n samples."""
    e = np.ones(n) * sustain
    na, nr = max(1, int(SR * a)), max(1, int(SR * r))
    e[:na] = np.linspace(0, sustain, na)
    if nr < n:
        e[-nr:] = sustain * np.linspace(1, 0, nr) ** 2
    return e


def tri(freq, tt):
    return 2 * np.abs(2 * ((tt * freq) % 1) - 1) - 1


def lowpass(x, cutoff):
    """One-pole low-pass (cutoff may be an array for sweeps)."""
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def note(n):
    """MIDI note number to Hz."""
    return 440.0 * 2 ** ((n - 69) / 12)


def loop_reverb(x, mix=0.28):
    """Feedback-comb reverb done with circular shifts, so the tail wraps and the loop stays seamless."""
    wet = np.zeros_like(x)
    for d_ms, g in [(97, 0.55), (131, 0.5), (173, 0.45), (229, 0.4)]:
        d = int(SR * d_ms / 1000)
        acc = x.copy()
        for k in range(1, 7):
            acc = acc + (g ** k) * np.roll(x, d * k)
        wet += acc
    wet = lowpass(wet, 3200)
    return (1 - mix) * x + mix * wet / np.max(np.abs(wet)) * np.max(np.abs(x))


def music_bed():
    """16 s loopable stereo pad: Cmaj9 → Am9 → Fmaj7 → G6sus, soft bass, panned arpeggio."""
    bar = 4.0
    chords = [[48, 55, 59, 62, 64], [45, 52, 55, 59, 60], [41, 48, 52, 55, 57], [43, 50, 55, 57, 62]]
    n = int(SR * bar * 4)
    L, R = np.zeros(n), np.zeros(n)

    def add(buf, sig, start):
        """Add sig at start, wrapping past the end so the loop is seamless."""
        idx = (start + np.arange(len(sig))) % n
        np.add.at(buf, idx, sig)

    for ci, ch in enumerate(chords):
        tt = t(bar + 1.5)
        e = env(len(tt), a=1.2, r=1.6)
        start = int(SR * bar * ci)
        # detuned pad voices, spread left/right for width
        padL = sum(0.6 * np.sin(2 * np.pi * note(m) * 0.998 * tt) + 0.22 * tri(note(m) * 1.003, tt) for m in ch) / len(ch)
        padR = sum(0.6 * np.sin(2 * np.pi * note(m) * 1.002 * tt) + 0.22 * tri(note(m) * 0.997, tt) for m in ch) / len(ch)
        add(L, padL * e * 0.5, start)
        add(R, padR * e * 0.5, start)
        # soft sub bass on the root
        bt = t(bar)
        bass = np.sin(2 * np.pi * note(ch[0] - 12) * bt) * env(len(bt), a=0.08, r=1.2) * 0.22
        add(L, bass, start)
        add(R, bass, start)
        # arpeggio: 8 soft plucks per bar, alternating sides
        arp = [ch[2] + 12, ch[3] + 12, ch[4] + 12, ch[3] + 12]
        for k in range(8):
            pt = t(0.9)
            f = note(arp[k % 4])
            pl = (np.sin(2 * np.pi * f * pt) + 0.3 * np.sin(4 * np.pi * f * pt)) * np.exp(-pt * 6) * np.minimum(1, pt * 400)
            s0 = start + int(SR * k * bar / 8)
            pan = 0.3 if k % 2 else 0.7
            add(L, pl * 0.11 * (1 - pan) * 2, s0)
            add(R, pl * 0.11 * pan * 2, s0)
    L, R = lowpass(L, 2600), lowpass(R, 2600)
    L, R = loop_reverb(L), loop_reverb(R)
    x = np.stack([L, R])
    x = np.tanh(x / np.max(np.abs(x)) * 1.2) / np.tanh(1.2)  # gentle glue
    return x * 0.6


def whoosh():
    tt = t(0.7)
    noise = rng.standard_normal(len(tt))
    sweep = np.interp(tt, [0, 0.35, 0.7], [400, 4200, 600])
    x = lowpass(noise, sweep) - lowpass(noise, sweep * 0.25)
    x *= np.sin(np.pi * tt / 0.7) ** 2
    return x / np.max(np.abs(x)) * 0.45


def tick():
    tt = t(0.09)
    x = np.sin(2 * np.pi * 2200 * tt) * np.exp(-tt * 70) + 0.4 * rng.standard_normal(len(tt)) * np.exp(-tt * 160)
    return x / np.max(np.abs(x)) * 0.35


def pop():
    tt = t(0.18)
    f = np.interp(tt, [0, 0.18], [900, 420])
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 28)
    return x / np.max(np.abs(x)) * 0.45


def stamp():
    tt = t(0.6)
    body = np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, 0.25], [140, 55])) / SR) * np.exp(-tt * 9)
    hit = lowpass(rng.standard_normal(len(tt)), 1800) * np.exp(-tt * 40)
    x = body + 0.8 * hit
    return x / np.max(np.abs(x)) * 0.8


def chime():
    tt = t(1.6)
    x = np.zeros(len(tt))
    for i, n in enumerate([72, 76, 79, 84]):
        d = int(SR * 0.07 * i)
        tone = (np.sin(2 * np.pi * note(n) * tt) + 0.2 * np.sin(2 * np.pi * note(n) * 2.01 * tt)) * np.exp(-tt * 3.2)
        x[d:] += tone[: len(x) - d]
    return x / np.max(np.abs(x)) * 0.5


def riser():
    tt = t(1.4)
    f = np.interp(tt, [0, 1.4], [180, 900])
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4
    noise = lowpass(rng.standard_normal(len(tt)), np.interp(tt, [0, 1.4], [300, 5000])) * 0.6
    x = (tone + noise) * np.linspace(0, 1, len(tt)) ** 2
    return x / np.max(np.abs(x)) * 0.4


def finish(x):
    """Short fade-out so no effect ends on a click."""
    x = np.atleast_2d(x).astype(np.float64)
    nf = min(x.shape[1], int(SR * 0.012))
    x[:, -nf:] *= np.linspace(1, 0, nf)
    return x


def write_mp3(name, x, loop=False):
    x = np.atleast_2d(x) if loop else finish(x)
    x = np.clip(x, -1, 1)
    ch = x.shape[0]
    pcm = (x.T * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    out = os.path.join(OUT, f'{name}.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', '160k' if ch == 2 else '96k', out], check=True)
    os.remove(tmp)
    print('wrote', os.path.relpath(out))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    write_mp3('bed', music_bed(), loop=True)
    for name, fn in [('whoosh', whoosh), ('tick', tick), ('pop', pop), ('stamp', stamp), ('chime', chime), ('riser', riser)]:
        write_mp3(name, fn())
