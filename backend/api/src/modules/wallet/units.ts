/**
 * Units valuation for the FINANCIAL wallet economy (Phase 2).
 *
 * The reference package fixes the canonical unit value at **1 unit = 30 USD**
 * (SUPER_DREAMS_DNA / FXRTC screens: `UNIT=30`, "1 unit = 30 USD"). This is a
 * reference-defined business rule (preserved verbatim — do not change without a
 * product decision). FINANCIAL wallet balances are stored, like all money in the
 * system, as integer USD **minor units (cents)**; "units" are a derived,
 * member-facing quantity = cents / UNIT_VALUE_USD_CENTS.
 */

/** Canonical value of one unit, in USD cents (1 unit = $30 = 3000 cents). */
export const UNIT_VALUE_USD_CENTS = 3000;

/** USD-cents value of a whole/fractional number of units. */
export function centsFromUnits(units: number): number {
  return Math.round(units * UNIT_VALUE_USD_CENTS);
}

/** Units represented by an amount of USD cents (may be fractional). */
export function unitsFromCents(cents: number): number {
  return cents / UNIT_VALUE_USD_CENTS;
}
