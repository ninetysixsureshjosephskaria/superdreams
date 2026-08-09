import { describe, expect, it } from 'vitest';

import {
  assignDistinctTimes,
  daysInMonth,
  monthDays,
  profitAmountCents,
  spreadInteger,
} from '../domain/profit';

/** Phase 2E — daily-profit maths (base = units×30 = balance in cents; bps rates). */
describe('daily profit maths', () => {
  it('computes profit as round(base × bps / 10000)', () => {
    expect(profitAmountCents(30_000, 100)).toBe(300); // 1% of $300
    expect(profitAmountCents(60_000, 200)).toBe(1200); // 2% of $600
    expect(profitAmountCents(0, 500)).toBe(0); // zero base
    expect(profitAmountCents(30_000, 0)).toBe(0); // zero rate
  });

  it('spreads an integer target evenly and sums exactly to the target', () => {
    const spread = spreadInteger(310, 31);
    expect(spread).toHaveLength(31);
    expect(spread.every((v) => v === 10)).toBe(true);
    expect(spread.reduce((a, b) => a + b, 0)).toBe(310);

    const uneven = spreadInteger(100, 31);
    expect(uneven.reduce((a, b) => a + b, 0)).toBe(100); // remainder distributed
    expect(Math.max(...uneven) - Math.min(...uneven)).toBeLessThanOrEqual(1);

    expect(spreadInteger(5, 0)).toEqual([]);
  });

  it('enumerates month days', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2026-03')).toBe(31);
    expect(monthDays('2026-03')).toHaveLength(31);
    expect(monthDays('2026-03')[0]).toBe('2026-03-01');
    expect(monthDays('2026-03')[30]).toBe('2026-03-31');
  });

  it('assigns distinct 23:00–23:59 distribution times (no repeats)', () => {
    const times = assignDistinctTimes(31, () => 0.5);
    expect(times).toHaveLength(31);
    expect(new Set(times).size).toBe(31); // all distinct
    expect(times.every((t) => /^23:[0-5]\d$/.test(t))).toBe(true);
  });
});
