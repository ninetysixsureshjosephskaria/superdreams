/**
 * Commission tier maths (Phase 2E) — pure, deterministic, unit-tested. Rates are
 * basis points (100 bps = 1%). Reference-defined defaults (commission.html §2.5):
 * 0–300u = 5%, 301–500u = 6%, 501+u = 7%; referral rate 2%.
 */

export interface TierShape {
  fromUnits: number;
  toUnits: number | null;
  rateBps: number;
}

/** Reference-defined default ("fallback") commission tiers. */
export const DEFAULT_TIERS: readonly TierShape[] = [
  { fromUnits: 0, toUnits: 300, rateBps: 500 },
  { fromUnits: 301, toUnits: 500, rateBps: 600 },
  { fromUnits: 501, toUnits: null, rateBps: 700 },
];

/** Reference-defined default one-time member-referral rate (2%). */
export const DEFAULT_REFERRAL_RATE_BPS = 200;

/**
 * Selects the commission rate (bps) for a partner's total network units. Returns
 * the matching tier's rate, or 0 when no tier covers the value.
 */
export function matchTierRateBps(tiers: readonly TierShape[], networkUnits: number): number {
  const sorted = [...tiers].sort((a, b) => a.fromUnits - b.fromUnits);
  for (const tier of sorted) {
    const withinLower = networkUnits >= tier.fromUnits;
    const withinUpper = tier.toUnits === null || networkUnits <= tier.toUnits;
    if (withinLower && withinUpper) {
      return tier.rateBps;
    }
  }
  return 0;
}

/** Whether any two tier ranges overlap (treats null `toUnits` as +∞). */
export function tiersOverlap(tiers: readonly TierShape[]): boolean {
  const sorted = [...tiers].sort((a, b) => a.fromUnits - b.fromUnits);
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    const prevUpper = prev.toUnits ?? Number.POSITIVE_INFINITY;
    if (curr.fromUnits <= prevUpper) {
      return true;
    }
  }
  return false;
}

/** Commission on an amount (cents) at a bps rate, rounded to whole cents. */
export function commissionCents(amountCents: number, rateBps: number): number {
  return Math.round((amountCents * rateBps) / 10_000);
}
