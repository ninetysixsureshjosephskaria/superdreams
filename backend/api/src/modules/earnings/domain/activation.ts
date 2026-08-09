/**
 * Activation-bonus maths + trigger (Phase 2E) — pure, deterministic, unit-tested.
 * Reference (`actbonus.html`): a member who adds 2 members within a day earns a
 * percentage-of-balance or fixed reward (TXN-A).
 */

/** One day, in milliseconds — the activation qualifying window. */
export const ACTIVATION_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Whether at least two of the given join times fall within a single `windowMs`
 * span (i.e. "added 2 members within a day"). Since the tightest pair is always
 * adjacent once sorted, a consecutive-gap check is sufficient and exact.
 */
export function hasTwoWithinWindow(
  joinTimes: Date[],
  windowMs: number = ACTIVATION_WINDOW_MS,
): boolean {
  if (joinTimes.length < 2) {
    return false;
  }
  const sorted = [...joinTimes].map((d) => d.getTime()).sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i]! - sorted[i - 1]! <= windowMs) {
      return true;
    }
  }
  return false;
}

/**
 * Activation reward amount (cents): a fixed amount, or a percentage (bps) of the
 * member's available balance.
 */
export function activationAmountCents(
  config: { rewardType: 'PERCENT' | 'FIXED'; value: number },
  balanceCents: number,
): number {
  if (config.value <= 0) {
    return 0;
  }
  if (config.rewardType === 'FIXED') {
    return config.value;
  }
  if (balanceCents <= 0) {
    return 0;
  }
  return Math.round((balanceCents * config.value) / 10_000);
}
