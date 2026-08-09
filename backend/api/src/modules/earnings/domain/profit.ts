/**
 * Daily-profit maths (Phase 2E) — pure, deterministic, unit-tested.
 *
 * Reference formula (`profit.html`): `base = units × 30` (USD). In our integer
 * model a wallet's profit base in cents equals its available balance in cents
 * (1 unit = $30 = 3000 cents), so `amount = round(baseCents × bps / 10000)`.
 */

/** Profit on a base amount (cents) at a bps rate, rounded to whole cents. */
export function profitAmountCents(baseCents: number, bps: number): number {
  if (baseCents <= 0 || bps <= 0) {
    return 0;
  }
  return Math.round((baseCents * bps) / 10_000);
}

/**
 * Distributes an integer `total` across `buckets` as evenly as possible (the
 * reference `spreadUnits`). The first `total % buckets` buckets get one extra, so
 * the result always sums exactly to `total`.
 */
export function spreadInteger(total: number, buckets: number): number[] {
  if (buckets <= 0) {
    return [];
  }
  const base = Math.floor(total / buckets);
  const remainder = total - base * buckets;
  return Array.from({ length: buckets }, (_v, i) => base + (i < remainder ? 1 : 0));
}

/** Number of days in a `YYYY-MM` month. */
export function daysInMonth(month: string): number {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  return new Date(year, monthNum, 0).getDate();
}

/** All calendar days of a `YYYY-MM` month as `YYYY-MM-DD` strings. */
export function monthDays(month: string): string[] {
  const count = daysInMonth(month);
  return Array.from({ length: count }, (_v, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

/**
 * Assigns `count` distinct minutes within the 23:00–23:59 distribution window
 * (reference: randomised, never repeating). `rng` is injectable for deterministic
 * tests; `count` must be ≤ 60.
 */
export function assignDistinctTimes(count: number, rng: () => number = Math.random): string[] {
  const minutes = Array.from({ length: 60 }, (_v, i) => i);
  // Fisher–Yates shuffle using the injected RNG.
  for (let i = minutes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = minutes[i]!;
    minutes[i] = minutes[j]!;
    minutes[j] = tmp;
  }
  return minutes.slice(0, Math.min(count, 60)).map((m) => `23:${String(m).padStart(2, '0')}`);
}
