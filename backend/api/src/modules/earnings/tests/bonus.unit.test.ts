import { describe, expect, it } from 'vitest';

import {
  bonusCents,
  deriveStatus,
  isLive,
  selectCampaign,
  type CampaignWindow,
} from '../domain/bonus';

const NOW = new Date('2026-06-15T12:00:00Z');

function win(over: Partial<CampaignWindow>): CampaignWindow {
  return {
    id: 'c1',
    rateBps: 500,
    enabled: true,
    permanent: false,
    startAt: null,
    endAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...over,
  };
}

/** Phase 2E — bonus campaign status, selection and calculation. */
describe('bonus campaign domain', () => {
  it('derives status from enabled + window', () => {
    expect(deriveStatus(win({ enabled: false }), NOW)).toBe('DISABLED');
    expect(deriveStatus(win({ startAt: new Date('2026-07-01') }), NOW)).toBe('SCHEDULED');
    expect(deriveStatus(win({ endAt: new Date('2026-05-01') }), NOW)).toBe('ENDED');
    expect(deriveStatus(win({ permanent: true }), NOW)).toBe('LIVE');
    expect(
      deriveStatus(win({ startAt: new Date('2026-06-01'), endAt: new Date('2026-06-30') }), NOW),
    ).toBe('LIVE');
    // Permanent ignores a stale endAt.
    expect(deriveStatus(win({ permanent: true, endAt: new Date('2026-05-01') }), NOW)).toBe('LIVE');
  });

  it('isLive matches LIVE status', () => {
    expect(isLive(win({ permanent: true }), NOW)).toBe(true);
    expect(isLive(win({ enabled: false }), NOW)).toBe(false);
  });

  it('selects deterministically by highest rate then earliest creation', () => {
    const a = win({ id: 'a', rateBps: 500, createdAt: new Date('2026-01-01') });
    const b = win({ id: 'b', rateBps: 1000, createdAt: new Date('2026-02-01') });
    const c = win({ id: 'c', rateBps: 1000, createdAt: new Date('2026-01-15') });
    expect(selectCampaign([a, b, c])?.id).toBe('c'); // 1000 rate, earliest of the two
    expect(selectCampaign([])).toBeNull();
  });

  it('computes bonus cents', () => {
    expect(bonusCents(30_000, 1000)).toBe(3000); // 10%
    expect(bonusCents(30_000, 500)).toBe(1500); // 5%
    expect(bonusCents(0, 1000)).toBe(0);
    expect(bonusCents(30_000, 0)).toBe(0);
  });
});
