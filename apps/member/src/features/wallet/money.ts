import { formatCurrency } from '@superdreams/utils';

/** Formats integer minor units (1/100 of the major unit) as a currency string. */
export function formatMinor(minor: number, currency: string): string {
  return formatCurrency(minor / 100, currency);
}
