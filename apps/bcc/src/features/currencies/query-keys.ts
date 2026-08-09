import type { ListCurrenciesParams } from '@superdreams/api-client';

/** Query-key factory for the currencies admin surface. */
export const currencyKeys = {
  all: ['currencies'] as const,
  list: (params: ListCurrenciesParams) => [...currencyKeys.all, 'list', params] as const,
};
