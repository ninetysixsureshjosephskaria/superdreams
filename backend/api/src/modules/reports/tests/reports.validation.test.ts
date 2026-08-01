import { describe, expect, it } from 'vitest';

import { renderCsv } from '../exporters';
import { createScheduleSchema, reportFiltersSchema, runReportSchema } from '../validators';

describe('report validators', () => {
  it('uppercases report codes', () => {
    expect(runReportSchema.parse({ code: 'members_summary' }).code).toBe('MEMBERS_SUMMARY');
  });

  it('rejects a reversed date range', () => {
    expect(
      reportFiltersSchema.safeParse({
        dateFrom: '2026-06-01T00:00:00.000Z',
        dateTo: '2026-01-01T00:00:00.000Z',
      }).success,
    ).toBe(false);
    expect(
      reportFiltersSchema.safeParse({
        dateFrom: '2026-01-01T00:00:00.000Z',
        dateTo: '2026-06-01T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('requires a cron expression for CUSTOM schedules and validates it', () => {
    expect(
      createScheduleSchema.safeParse({ code: 'MEMBERS_SUMMARY', name: 'x', frequency: 'CUSTOM' })
        .success,
    ).toBe(false);
    expect(
      createScheduleSchema.safeParse({
        code: 'MEMBERS_SUMMARY',
        name: 'x',
        frequency: 'CUSTOM',
        cron: 'not a cron',
      }).success,
    ).toBe(false);
    expect(
      createScheduleSchema.safeParse({
        code: 'MEMBERS_SUMMARY',
        name: 'x',
        frequency: 'CUSTOM',
        cron: '0 6 * * 1',
      }).success,
    ).toBe(true);
  });
});

describe('csv exporter', () => {
  it('escapes commas, quotes and newlines (RFC 4180)', () => {
    const csv = renderCsv({
      code: 'X',
      name: 'X',
      columns: [
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B' },
      ],
      rows: [
        { a: 'plain', b: 'has,comma' },
        { a: 'has "quote"', b: null },
      ],
      summary: {},
      filters: {},
      rowCount: 2,
      generatedAt: new Date('2026-07-31T00:00:00.000Z'),
    });
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('A,B');
    expect(lines[1]).toBe('plain,"has,comma"');
    expect(lines[2]).toBe('"has ""quote""",');
  });
});
