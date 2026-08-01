import { describe, expect, it } from 'vitest';

import { deltasFor, applyDelta, totalMinor } from '../domain/balance';
import {
  adjustmentSchema,
  amountMinorSchema,
  createWalletSchema,
  currencyCodeSchema,
} from '../validators';

describe('wallet validators', () => {
  it('rejects non-positive or non-integer amounts', () => {
    expect(amountMinorSchema.safeParse(0).success).toBe(false);
    expect(amountMinorSchema.safeParse(-100).success).toBe(false);
    expect(amountMinorSchema.safeParse(10.5).success).toBe(false);
    expect(amountMinorSchema.safeParse(1500).success).toBe(true);
  });

  it('normalises currency codes to upper case and rejects bad ones', () => {
    expect(currencyCodeSchema.parse('usd')).toBe('USD');
    expect(currencyCodeSchema.safeParse('US').success).toBe(false);
    expect(currencyCodeSchema.safeParse('DOLLAR').success).toBe(false);
  });

  it('requires a member id to create a wallet', () => {
    expect(createWalletSchema.safeParse({}).success).toBe(false);
    expect(
      createWalletSchema.safeParse({ memberId: '00000000-0000-0000-0000-000000000001' }).success,
    ).toBe(true);
  });

  it('requires a reason and direction for adjustments', () => {
    expect(adjustmentSchema.safeParse({ amountMinor: 100 }).success).toBe(false);
    expect(
      adjustmentSchema.safeParse({ direction: 'CREDIT', amountMinor: 100, reason: 'correction' })
        .success,
    ).toBe(true);
  });
});

describe('balance domain', () => {
  it('maps transaction types to signed deltas', () => {
    expect(deltasFor('CREDIT', 'CREDIT', 100)).toEqual({ availableMinor: 100, heldMinor: 0 });
    expect(deltasFor('DEBIT', 'DEBIT', 100)).toEqual({ availableMinor: -100, heldMinor: 0 });
    expect(deltasFor('HOLD', 'DEBIT', 100)).toEqual({ availableMinor: -100, heldMinor: 100 });
    expect(deltasFor('RELEASE', 'CREDIT', 100)).toEqual({ availableMinor: 100, heldMinor: -100 });
    expect(deltasFor('ADJUSTMENT', 'DEBIT', 40)).toEqual({ availableMinor: -40, heldMinor: 0 });
  });

  it('keeps total unchanged across a hold then release', () => {
    let snapshot = { availableMinor: 1000, heldMinor: 0 };
    snapshot = applyDelta(snapshot, deltasFor('HOLD', 'DEBIT', 300));
    expect(snapshot).toEqual({ availableMinor: 700, heldMinor: 300 });
    expect(totalMinor(snapshot)).toBe(1000);
    snapshot = applyDelta(snapshot, deltasFor('RELEASE', 'CREDIT', 300));
    expect(snapshot).toEqual({ availableMinor: 1000, heldMinor: 0 });
    expect(totalMinor(snapshot)).toBe(1000);
  });
});
