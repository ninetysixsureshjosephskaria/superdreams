import { boolean, char, index, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';

/** ISO 3166-1 countries (reference data; populated by reference seeds, not here). */
export const countries = pgTable(
  'countries',
  {
    ...baseColumns(),
    code: char('code', { length: 2 }).notNull(),
    code3: char('code3', { length: 3 }),
    numericCode: char('numeric_code', { length: 3 }),
    name: text('name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('countries_code_uq').on(table.code),
    index('countries_is_active_idx').on(table.isActive),
  ],
);

/** ISO 4217 currencies. */
export const currencies = pgTable(
  'currencies',
  {
    ...baseColumns(),
    code: char('code', { length: 3 }).notNull(),
    name: text('name').notNull(),
    symbol: text('symbol'),
    decimalDigits: integer('decimal_digits').notNull().default(2),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [uniqueIndex('currencies_code_uq').on(table.code)],
);

/** ISO 639-1 languages. */
export const languages = pgTable(
  'languages',
  {
    ...baseColumns(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    nativeName: text('native_name'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [uniqueIndex('languages_code_uq').on(table.code)],
);

/** IANA time zones. */
export const timezones = pgTable(
  'timezones',
  {
    ...baseColumns(),
    name: text('name').notNull(),
    utcOffset: text('utc_offset'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [uniqueIndex('timezones_name_uq').on(table.name)],
);
