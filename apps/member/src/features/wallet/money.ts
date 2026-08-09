import { formatCurrency } from '@superdreams/utils';

/** Formats integer minor units (1/100 of the major unit) as a currency string. */
export function formatMinor(minor: number, currency: string): string {
  return formatCurrency(minor / 100, currency);
}

/**
 * Super Dreams financial wallet unit peg: 1 unit = $30 = 3000 integer USD cents.
 * The FINANCIAL wallet stores integer cents; "units" is the member-facing
 * quantity derived from the balance. This mirrors the backend
 * `UNIT_VALUE_USD_CENTS` constant and is display-only (no money is computed here).
 */
export const UNIT_VALUE_CENTS = 3000;

/** Converts integer USD cents to a (possibly fractional) unit quantity. */
export function centsToUnits(cents: number): number {
  return cents / UNIT_VALUE_CENTS;
}

/** Formats a cents balance as a unit quantity (up to 2 dp, trailing zeros dropped). */
export function formatUnits(cents: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(centsToUnits(cents));
}

/** Converts a whole unit quantity to integer USD cents (display/estimate only). */
export function unitsToCents(units: number): number {
  return Math.round(units * UNIT_VALUE_CENTS);
}

/** Formats the USD value of a unit quantity (1 unit = $30). Display-only estimate. */
export function formatUsdFromUnits(units: number, currency = 'USD'): string {
  return formatMinor(unitsToCents(units), currency);
}

/** Formats basis points as a percentage (1000 bps → "10%", 550 → "5.5%"). */
export function formatBpsAsPercent(bps: number): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(bps / 100)}%`;
}

/**
 * Early-unlock fee preview in cents. Mirrors the backend formula
 * (`round(principalCents * feeBps / 10000)`) purely for pre-confirmation display;
 * the backend recomputes and charges the authoritative amount.
 */
export function feeCentsFromBps(principalCents: number, feeBps: number): number {
  return Math.round((principalCents * feeBps) / 10000);
}
