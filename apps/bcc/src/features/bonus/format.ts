/** Basis points → percent string (100 bps = 1%). Display-only. */
export function bpsToPct(bps: number): string {
  return `${bps / 100}%`;
}

/** Percent → basis points, rounded to a whole bps. */
export function pctToBps(pct: number): number {
  return Math.round(pct * 100);
}

/** ISO timestamp → a `datetime-local` input value (`YYYY-MM-DDTHH:mm`, local). */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A `datetime-local` input value → an ISO timestamp for the backend. */
export function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}
