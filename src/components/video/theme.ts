import type { TokKind } from '@/components/project/highlight';

/** Shared look for Remotion videos: the same paper/ink palette and type as the app. */
export const V = {
  width: 1280,
  height: 720,
  fps: 30,
  paper: '#F3F1EC',
  sheet: '#FBFAF7',
  ink: '#111110',
  ink2: '#2A2927',
  muted: '#5E5B56',
  line: '#E3DFD7',
  lime: '#CDEB5A',
  olive: '#4A5A1E',
  orange: '#FF7A3D',
  sky: '#7FB8FF',
  red: '#B42318',
  serif: '"Instrument Serif", Georgia, serif',
  sans: 'Geist, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

/** Same colours as the app's code viewer (TOKEN_CLASS), as plain values for inline styles. */
export const TOKEN_COLOR: Record<TokKind, string> = {
  plain: V.ink,
  kw: '#9A3B12',
  str: '#3F6212',
  com: '#716D66',
  num: '#8A5300',
  fn: '#1F4E8C',
  type: '#0B6464',
  key: '#1F4E8C',
  tag: '#9A3B12',
  attr: '#8A5300',
  punct: V.muted,
};
