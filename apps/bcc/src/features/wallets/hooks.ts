import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  AdjustmentInput,
  AmountInput,
  ApiError,
  ChangeWalletStatusInput,
  CreateWalletInput,
  HoldInput,
  ListTransactionsParams,
  ListWalletsParams,
  PaginatedTransactions,
  PaginatedWallets,
  WalletDetail,
  WalletHoldData,
  WalletStatementData,
  WalletTransactionData,
} from '@superdreams/api-client';

import { walletApi } from './api';
import { walletKeys } from './query-keys';

export function useWallets(params: ListWalletsParams): UseQueryResult<PaginatedWallets, ApiError> {
  return useQuery({
    queryKey: walletKeys.list(params),
    queryFn: () => walletApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useWallet(id: string): UseQueryResult<WalletDetail, ApiError> {
  return useQuery({ queryKey: walletKeys.detail(id), queryFn: () => walletApi.get(id) });
}

export function useWalletTransactions(
  id: string,
  params: ListTransactionsParams,
): UseQueryResult<PaginatedTransactions, ApiError> {
  return useQuery({
    queryKey: walletKeys.transactions(id, params),
    queryFn: () => walletApi.listTransactions(id, params),
    placeholderData: keepPreviousData,
  });
}

export function useWalletHolds(id: string): UseQueryResult<WalletHoldData[], ApiError> {
  return useQuery({ queryKey: walletKeys.holds(id), queryFn: () => walletApi.listHolds(id) });
}

export function useWalletStatements(id: string): UseQueryResult<WalletStatementData[], ApiError> {
  return useQuery({
    queryKey: walletKeys.statements(id),
    queryFn: () => walletApi.listStatements(id),
  });
}

/** Invalidates every query tied to a wallet after a balance-changing action. */
function useWalletInvalidation(id: string): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: walletKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: walletKeys.lists() });
  };
}

export function useCreateWallet(): UseMutationResult<WalletDetail, ApiError, CreateWalletInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWalletInput) => walletApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walletKeys.lists() });
    },
  });
}

export function useChangeWalletStatus(
  id: string,
): UseMutationResult<WalletDetail, ApiError, ChangeWalletStatusInput> {
  const invalidate = useWalletInvalidation(id);
  return useMutation({
    mutationFn: (input: ChangeWalletStatusInput) => walletApi.changeStatus(id, input),
    onSuccess: invalidate,
  });
}

export function useCreditWallet(
  id: string,
): UseMutationResult<WalletTransactionData, ApiError, AmountInput> {
  const invalidate = useWalletInvalidation(id);
  return useMutation({
    mutationFn: (input: AmountInput) => walletApi.credit(id, input),
    onSuccess: invalidate,
  });
}

export function useDebitWallet(
  id: string,
): UseMutationResult<WalletTransactionData, ApiError, AmountInput> {
  const invalidate = useWalletInvalidation(id);
  return useMutation({
    mutationFn: (input: AmountInput) => walletApi.debit(id, input),
    onSuccess: invalidate,
  });
}

export function useAdjustWallet(
  id: string,
): UseMutationResult<WalletTransactionData, ApiError, AdjustmentInput> {
  const invalidate = useWalletInvalidation(id);
  return useMutation({
    mutationFn: (input: AdjustmentInput) => walletApi.adjust(id, input),
    onSuccess: invalidate,
  });
}

export function usePlaceHold(id: string): UseMutationResult<WalletHoldData, ApiError, HoldInput> {
  const invalidate = useWalletInvalidation(id);
  return useMutation({
    mutationFn: (input: HoldInput) => walletApi.placeHold(id, input),
    onSuccess: invalidate,
  });
}

export function useReleaseHold(id: string): UseMutationResult<WalletHoldData, ApiError, string> {
  const invalidate = useWalletInvalidation(id);
  return useMutation({
    mutationFn: (holdId: string) => walletApi.releaseHold(id, holdId),
    onSuccess: invalidate,
  });
}

export function useReverseTransaction(
  id: string,
): UseMutationResult<WalletTransactionData, ApiError, string> {
  const invalidate = useWalletInvalidation(id);
  return useMutation({
    mutationFn: (transactionId: string) => walletApi.reverse(id, transactionId),
    onSuccess: invalidate,
  });
}

export function useGenerateStatement(
  id: string,
): UseMutationResult<WalletStatementData, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => walletApi.generateStatement(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walletKeys.statements(id) });
    },
  });
}
