import { ASPECTS, UNLOCK_AVERAGE, UNLOCK_FLOOR, type Aspect, type AspectScores } from '@/types/learning';
import { randomInt } from 'crypto';

/**
 * Six-skill scores from graded answers: per-aspect mean, rounded.
 * An aspect with no graded answers scores 0 (the quiz always covers all six).
 */
export function aspectScores(graded: { aspect: Aspect; score: number }[]): AspectScores {
  const sums = Object.fromEntries(ASPECTS.map((a) => [a, { s: 0, n: 0 }])) as Record<Aspect, { s: number; n: number }>;
  for (const g of graded) {
    if (!sums[g.aspect]) continue;
    sums[g.aspect].s += Math.max(0, Math.min(100, g.score));
    sums[g.aspect].n += 1;
  }
  return Object.fromEntries(ASPECTS.map((a) => [a, sums[a].n ? Math.round(sums[a].s / sums[a].n) : 0])) as AspectScores;
}

export function average(scores: AspectScores): number {
  return Math.round(ASPECTS.reduce((t, a) => t + scores[a], 0) / ASPECTS.length);
}

/** Unlock rule: average ≥ 60 and no skill below 40. */
export function isUnlocked(scores: AspectScores): boolean {
  return average(scores) >= UNLOCK_AVERAGE && ASPECTS.every((a) => scores[a] >= UNLOCK_FLOOR);
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

/** PJ-YYYY-XXXXXX */
export function newCertificateCode(now = new Date()): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `PJ-${now.getUTCFullYear()}-${s}`;
}

export function strengthFor(score: number): 'proficient' | 'advanced' | 'master' {
  return score >= 85 ? 'master' : score >= 70 ? 'advanced' : 'proficient';
}
