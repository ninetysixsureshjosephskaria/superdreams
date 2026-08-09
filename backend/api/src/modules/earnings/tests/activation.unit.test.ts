import { describe, expect, it } from 'vitest';

import { activationAmountCents, hasTwoWithinWindow } from '../domain/activation';

const DAY = 24 * 60 * 60 * 1000;
const base = new Date('2026-06-15T12:00:00Z').getTime();
const at = (offsetMs: number): Date => new Date(base + offsetMs);

/** Phase 2E — activation bonus: +2-in-a-day trigger + reward amount. */
describe('activation bonus domain', () => {
  it('detects two joins within a 24h window', () => {
    expect(hasTwoWithinWindow([at(0), at(2 * 60 * 60 * 1000)])).toBe(true); // 2h apart
    expect(hasTwoWithinWindow([at(0), at(DAY)])).toBe(true); // exactly 24h
    expect(hasTwoWithinWindow([at(0), at(DAY + 1)])).toBe(false); // just over 24h
    expect(hasTwoWithinWindow([at(0)])).toBe(false); // only one
    expect(hasTwoWithinWindow([])).toBe(false);
    // Three joins, a close pair exists → qualifies.
    expect(hasTwoWithinWindow([at(0), at(3 * DAY), at(3 * DAY + 60_000)])).toBe(true);
  });

  it('computes fixed and percentage rewards', () => {
    expect(activationAmountCents({ rewardType: 'FIXED', value: 500 }, 0)).toBe(500);
    expect(activationAmountCents({ rewardType: 'PERCENT', value: 1000 }, 30_000)).toBe(3000); // 10%
    expect(activationAmountCents({ rewardType: 'PERCENT', value: 1000 }, 0)).toBe(0); // no balance
    expect(activationAmountCents({ rewardType: 'FIXED', value: 0 }, 100)).toBe(0);
  });
});
