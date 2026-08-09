import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  ApiError,
  CreateCurrencyInput,
  CurrencyData,
  ListCurrenciesParams,
  UpdateCurrencyInput,
} from '@superdreams/api-client';

import { currenciesApi } from './api';
import { currencyKeys } from './query-keys';

/** The fixed internal currency table. */
export function useCurrencies(
  params: ListCurrenciesParams = {},
): UseQueryResult<CurrencyData[], ApiError> {
  return useQuery({
    queryKey: currencyKeys.list(params),
    queryFn: () => currenciesApi.list(params),
  });
}

function useCurrencyInvalidation(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: currencyKeys.all });
  };
}

/** Creates a currency (requires currency.manage). */
export function useCreateCurrency(): UseMutationResult<
  CurrencyData,
  ApiError,
  CreateCurrencyInput
> {
  const invalidate = useCurrencyInvalidation();
  return useMutation({
    mutationFn: (input: CreateCurrencyInput) => currenciesApi.create(input),
    onSuccess: invalidate,
  });
}

/** Updates a currency by code (requires currency.manage). */
export function useUpdateCurrency(): UseMutationResult<
  CurrencyData,
  ApiError,
  { code: string; input: UpdateCurrencyInput }
> {
  const invalidate = useCurrencyInvalidation();
  return useMutation({
    mutationFn: ({ code, input }: { code: string; input: UpdateCurrencyInput }) =>
      currenciesApi.update(code, input),
    onSuccess: invalidate,
  });
}

/** Deletes a currency by code (requires currency.manage; base is undeletable server-side). */
export function useDeleteCurrency(): UseMutationResult<
  { code: string; deleted: boolean },
  ApiError,
  string
> {
  const invalidate = useCurrencyInvalidation();
  return useMutation({
    mutationFn: (code: string) => currenciesApi.remove(code),
    onSuccess: invalidate,
  });
}
