import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import type {
  ApiError,
  ListTransactionsParams,
  PaginatedTransactions,
  WalletDetail,
  WalletHoldData,
  WalletStatementData,
} from '@superdreams/api-client';

import { walletApi } from './api';
import { walletKeys } from './query-keys';

export function useMyWallet(): UseQueryResult<WalletDetail, ApiError> {
  return useQuery({ queryKey: walletKeys.me, queryFn: () => walletApi.getMine(), retry: 1 });
}

export function useMyWalletTransactions(
  params: ListTransactionsParams,
): UseQueryResult<PaginatedTransactions, ApiError> {
  return useQuery({
    queryKey: walletKeys.transactions(params),
    queryFn: () => walletApi.listMyTransactions(params),
    placeholderData: keepPreviousData,
  });
}

export function useMyWalletStatements(): UseQueryResult<WalletStatementData[], ApiError> {
  return useQuery({
    queryKey: walletKeys.statements,
    queryFn: () => walletApi.listMyStatements(),
  });
}

export function useMyWalletHolds(): UseQueryResult<WalletHoldData[], ApiError> {
  return useQuery({ queryKey: walletKeys.holds, queryFn: () => walletApi.listMyHolds() });
}
