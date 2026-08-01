import { describe, expect, it } from 'vitest';

import { canTransition, evaluateEligibility } from '../domain/campaign';
import { createCampaignSchema, scheduleCampaignSchema } from '../validators';

describe('campaign validators', () => {
  it('uppercases the code and requires name + type', () => {
    const parsed = createCampaignSchema.parse({
      code: 'summer-24',
      name: 'Summer',
      type: 'SEASONAL',
    });
    expect(parsed.code).toBe('SUMMER-24');
    expect(createCampaignSchema.safeParse({ code: 'x', name: '', type: 'SEASONAL' }).success).toBe(
      false,
    );
  });

  it('rejects a campaign whose start is after its end', () => {
    const result = createCampaignSchema.safeParse({
      code: 'BAD',
      name: 'Bad dates',
      type: 'PROMOTIONAL',
      startsAt: '2026-08-10T00:00:00.000Z',
      endsAt: '2026-08-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('requires a start time for SCHEDULED and a cron for RECURRING', () => {
    expect(scheduleCampaignSchema.safeParse({ scheduleType: 'SCHEDULED' }).success).toBe(false);
    expect(
      scheduleCampaignSchema.safeParse({
        scheduleType: 'SCHEDULED',
        startAt: '2026-09-01T00:00:00.000Z',
      }).success,
    ).toBe(true);
    expect(scheduleCampaignSchema.safeParse({ scheduleType: 'RECURRING' }).success).toBe(false);
    expect(scheduleCampaignSchema.safeParse({ scheduleType: 'IMMEDIATE' }).success).toBe(true);
  });
});

describe('campaign domain', () => {
  it('enforces the lifecycle state machine', () => {
    expect(canTransition('DRAFT', 'ACTIVE')).toBe(true);
    expect(canTransition('DRAFT', 'SCHEDULED')).toBe(true);
    expect(canTransition('DRAFT', 'PAUSED')).toBe(false);
    expect(canTransition('ACTIVE', 'PAUSED')).toBe(true);
    expect(canTransition('ACTIVE', 'COMPLETED')).toBe(true);
    expect(canTransition('COMPLETED', 'ACTIVE')).toBe(false);
    expect(canTransition('ARCHIVED', 'ACTIVE')).toBe(false);
  });

  it('evaluates eligibility rules (AND-combined)', () => {
    const joinedAt = new Date('2026-01-15T00:00:00.000Z');
    const active = evaluateEligibility(
      [{ type: 'MEMBER_STATUS', value: 'ACTIVE', isActive: true }],
      { status: 'ACTIVE', joinedAt },
    );
    expect(active.eligible).toBe(true);

    const suspended = evaluateEligibility(
      [{ type: 'MEMBER_STATUS', value: 'ACTIVE', isActive: true }],
      { status: 'SUSPENDED', joinedAt },
    );
    expect(suspended.eligible).toBe(false);
    expect(suspended.failed).toContain('MEMBER_STATUS');

    const joinedBefore = evaluateEligibility(
      [{ type: 'JOIN_DATE_AFTER', value: '2026-02-01T00:00:00.000Z', isActive: true }],
      { status: 'ACTIVE', joinedAt },
    );
    expect(joinedBefore.eligible).toBe(false);

    // Inactive rules are ignored.
    const ignored = evaluateEligibility(
      [{ type: 'MEMBER_STATUS', value: 'ACTIVE', isActive: false }],
      { status: 'SUSPENDED', joinedAt },
    );
    expect(ignored.eligible).toBe(true);
  });
});
