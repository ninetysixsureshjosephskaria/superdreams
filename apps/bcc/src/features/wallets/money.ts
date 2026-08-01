import { formatCurrency } from '@superdreams/utils';

/**
 * Minor-unit helpers. Amounts are stored and sent as integer minor units
 * (1/100 of the major unit); the UI works in major units. A fixed divisor of
 * 100 covers the platform's supported currencies this phase.
 */
const MINOR_PER_MAJOR = 100;

/** Formats integer minor units as a localized currency string. */
export function formatMinor(minor: number, currency: string): string {
  return formatCurrency(minor / MINOR_PER_MAJOR, currency);
}

/** Converts a major-unit amount (e.g. 10.5) to integer minor units (1050). */
export function toMinor(amountMajor: number): number {
  return Math.round(amountMajor * MINOR_PER_MAJOR);
}
