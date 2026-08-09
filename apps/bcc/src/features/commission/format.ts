import type { CommissionTierData } from '@superdreams/api-client';

/** Basis points → percent (100 bps = 1%). Display-only conversion. */
export function bpsToPct(bps: number): number {
  return bps / 100;
}

/** Percent → basis points, rounded to a whole bps. Display-only conversion. */
export function pctToBps(pct: number): number {
  return Math.round(pct * 100);
}

/** Human-readable unit range for a tier (`301 – ∞` when open-ended). */
export function tierRangeLabel(tier: Pick<CommissionTierData, 'fromUnits' | 'toUnits'>): string {
  const from = tier.fromUnits.toLocaleString();
  const to = tier.toUnits === null ? '∞' : tier.toUnits.toLocaleString();
  return `${from} – ${to}`;
}
