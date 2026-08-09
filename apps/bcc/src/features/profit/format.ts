/** Basis points → percent string (100 bps = 1%). Display-only. */
export function bpsToPct(bps: number): string {
  return `${bps / 100}%`;
}

/** Current month as `YYYY-MM` (local time). */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** True when a string is a well-formed `YYYY-MM` month key. */
export function isMonthKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

/** Parses a `YYYY-MM` key into a `[year, monthIndex]` tuple (monthIndex is 0-based). */
function parseMonth(month: string): [number, number] {
  return [Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1];
}

/** Shifts a `YYYY-MM` month key by whole months (±). Returns a `YYYY-MM` key. */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = parseMonth(month);
  return new Date(Date.UTC(year, monthIndex + delta, 1)).toISOString().slice(0, 7);
}

/** Human month label, e.g. `2026-08` → `August 2026`. Display-only. */
export function formatMonthLabel(month: string): string {
  const [year, monthIndex] = parseMonth(month);
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** A single calendar grid slot: an in-month day, or `null` for alignment padding. */
export interface CalendarCell {
  dayNum: number;
  /** `YYYY-MM-DD` key matching backend `day` strings. */
  dayStr: string;
}

/**
 * Builds a Sun→Sat calendar grid for the given `YYYY-MM`: leading `null`s to
 * align the 1st under its weekday, one cell per real day, then trailing `null`s
 * to complete the final week. Length is always a multiple of 7.
 */
export function buildMonthGrid(month: string): (CalendarCell | null)[] {
  const [year, monthIndex] = parseMonth(month);
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells: (CalendarCell | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ dayNum: d, dayStr: `${month}-${String(d).padStart(2, '0')}` });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

/** Integer USD cents → `$1,234.56`. Display-only. */
export function usd(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}
