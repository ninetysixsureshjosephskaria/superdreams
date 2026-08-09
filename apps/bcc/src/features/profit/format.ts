/** Basis points → percent string (100 bps = 1%). Display-only. */
export function bpsToPct(bps: number): string {
  return `${bps / 100}%`;
}

/** Integer USD cents → `$1,234.56`. Display-only. */
export function usd(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}
