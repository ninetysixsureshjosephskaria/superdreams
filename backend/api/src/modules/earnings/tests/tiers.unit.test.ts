import { describe, expect, it } from 'vitest';

import {
  commissionCents,
  DEFAULT_REFERRAL_RATE_BPS,
  DEFAULT_TIERS,
  matchTierRateBps,
  tiersOverlap,
} from '../domain/tiers';

/** Phase 2E — commission tier maths (reference defaults 5/6/7%, referral 2%). */
describe('commission tier maths', () => {
  it('uses the reference-defined default tiers and referral rate', () => {
    expect(DEFAULT_TIERS.map((t) => t.rateBps)).toEqual([500, 600, 700]);
    expect(DEFAULT_REFERRAL_RATE_BPS).toBe(200);
  });

  it('matches the correct tier by total network units', () => {
    expect(matchTierRateBps(DEFAULT_TIERS, 0)).toBe(500); // 0–300 = 5%
    expect(matchTierRateBps(DEFAULT_TIERS, 300)).toBe(500);
    expect(matchTierRateBps(DEFAULT_TIERS, 301)).toBe(600); // 301–500 = 6%
    expect(matchTierRateBps(DEFAULT_TIERS, 500)).toBe(600);
    expect(matchTierRateBps(DEFAULT_TIERS, 501)).toBe(700); // 501+ = 7%
    expect(matchTierRateBps(DEFAULT_TIERS, 100_000)).toBe(700);
  });

  it('detects overlapping tier ranges', () => {
    expect(tiersOverlap(DEFAULT_TIERS)).toBe(false);
    expect(
      tiersOverlap([
        { fromUnits: 0, toUnits: 300, rateBps: 500 },
        { fromUnits: 200, toUnits: 400, rateBps: 600 },
      ]),
    ).toBe(true);
  });

  it('computes commission cents at a bps rate', () => {
    expect(commissionCents(30_000, 500)).toBe(1500); // 5% of $300
    expect(commissionCents(30_000, 200)).toBe(600); // 2% referral
  });
});
