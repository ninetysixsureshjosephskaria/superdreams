import { describe, expect, it } from 'vitest';

import { computeRulePoints, pointsDelta } from '../domain/points';
import { adjustSchema, allocateSchema, createProgramSchema, pointsSchema } from '../validators';

describe('reward validators', () => {
  it('rejects non-positive or non-integer points', () => {
    expect(pointsSchema.safeParse(0).success).toBe(false);
    expect(pointsSchema.safeParse(-5).success).toBe(false);
    expect(pointsSchema.safeParse(2.5).success).toBe(false);
    expect(pointsSchema.safeParse(250).success).toBe(true);
  });

  it('uppercases the program code and requires a type', () => {
    const parsed = createProgramSchema.parse({ code: 'welcome-1', name: 'Welcome', type: 'FIXED' });
    expect(parsed.code).toBe('WELCOME-1');
    expect(createProgramSchema.safeParse({ code: 'x', name: 'y' }).success).toBe(false);
  });

  it('requires points or a ruleId to allocate', () => {
    expect(allocateSchema.safeParse({}).success).toBe(false);
    expect(allocateSchema.safeParse({ points: 100 }).success).toBe(true);
    expect(
      allocateSchema.safeParse({ ruleId: '00000000-0000-0000-0000-000000000001' }).success,
    ).toBe(true);
  });

  it('requires a reason and direction for adjustments', () => {
    expect(adjustSchema.safeParse({ points: 10 }).success).toBe(false);
    expect(
      adjustSchema.safeParse({ direction: 'CREDIT', points: 10, reason: 'goodwill' }).success,
    ).toBe(true);
  });
});

describe('reward engine domain', () => {
  it('maps transaction types to signed point deltas', () => {
    expect(pointsDelta('EARN', 'CREDIT', 100)).toBe(100);
    expect(pointsDelta('REDEEM', 'DEBIT', 100)).toBe(-100);
    expect(pointsDelta('EXPIRE', 'DEBIT', 100)).toBe(-100);
    expect(pointsDelta('ADJUSTMENT', 'CREDIT', 40)).toBe(40);
    expect(pointsDelta('ADJUSTMENT', 'DEBIT', 40)).toBe(-40);
    expect(pointsDelta('REVERSAL', 'DEBIT', 100)).toBe(-100);
  });

  it('computes rule points for FIXED and PERCENTAGE rules', () => {
    expect(computeRulePoints({ type: 'FIXED', points: 50, rateBasisPoints: null })).toBe(50);
    // 250 basis points (2.5%) of 10000 = 250.
    expect(
      computeRulePoints({
        type: 'PERCENTAGE',
        points: null,
        rateBasisPoints: 250,
        baseValue: 10_000,
      }),
    ).toBe(250);
    expect(
      computeRulePoints({ type: 'PERCENTAGE', points: null, rateBasisPoints: 250 }),
    ).toBeNull();
  });
});
