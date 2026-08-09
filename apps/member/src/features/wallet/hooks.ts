import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  ApiError,
  CreateDepositInput,
  CreateWithdrawalInput,
  DepositTrancheData,
  FinancialLimitsData,
  FinancialRequestData,
  ListTransactionsParams,
  PaginatedTransactions,
  WalletDetail,
  WalletHoldData,
  WalletStatementData,
} from '@superdreams/api-client';

import { walletApi } from './api';
import { financeApi } from './finance-api';
import { walletKeys } from './query-keys';

export function useMyWallet(): UseQueryResult<WalletDetail, ApiError> {
  return useQuery({ queryKey: walletKeys.me, queryFn: () => walletApi.getMine(), retry: 1 });
}

/**
 * The member's FINANCIAL (units) wallet. It is created lazily on the member's
 * first approved deposit, so a 404 is an expected "not yet" state — not retried
 * and surfaced by the page as an empty state rather than an error.
 */
export function useMyFinancialWallet(): UseQueryResult<WalletDetail, ApiError> {
  return useQuery({
    queryKey: walletKeys.financial,
    queryFn: () => walletApi.getMine('FINANCIAL'),
    retry: (failureCount, error) => error.status !== 404 && failureCount < 1,
  });
}

/** The member's FINANCIAL wallet ledger (kind=FINANCIAL), for the funds activity view. */
export function useMyFinancialTransactions(
  params: ListTransactionsParams,
): UseQueryResult<PaginatedTransactions, ApiError> {
  return useQuery({
    queryKey: walletKeys.financialTransactions(params),
    queryFn: () => walletApi.listMyTransactions(params, 'FINANCIAL'),
    placeholderData: keepPreviousData,
  });
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

// --- Finance: deposits (2F-B) ------------------------------------------------

/** System-wide deposit/withdrawal limits (backend is the source of truth). */
export function useFinancialLimits(): UseQueryResult<FinancialLimitsData, ApiError> {
  return useQuery({ queryKey: walletKeys.financeLimits, queryFn: () => financeApi.getLimits() });
}

/** The member's own deposit + withdrawal requests, newest first. */
export function useMyFinancialRequests(): UseQueryResult<FinancialRequestData[], ApiError> {
  return useQuery({
    queryKey: walletKeys.financeRequests,
    queryFn: () => financeApi.listMyRequests(),
  });
}

/** The member's own deposit tranches (locked capital + bonus/maturity). */
export function useMyTranches(): UseQueryResult<DepositTrancheData[], ApiError> {
  return useQuery({
    queryKey: walletKeys.financeTranches,
    queryFn: () => financeApi.listMyTranches(),
  });
}

/**
 * Early-unlocks a LOCKED tranche. The backend charges the configured fee and
 * forfeits the bonus atomically; on success we refresh tranches, the financial
 * wallet balance and its ledger. `isPending` gates the confirm button against
 * duplicate submissions.
 */
export function useEarlyUnlockTranche(): UseMutationResult<DepositTrancheData, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trancheId: string) => financeApi.earlyUnlockTranche(trancheId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walletKeys.financeTranches });
      void queryClient.invalidateQueries({ queryKey: walletKeys.financial });
      void queryClient.invalidateQueries({
        queryKey: ['wallet', 'me', 'financial', 'transactions'],
      });
    },
  });
}

/**
 * Submits a deposit request. The backend creates a PENDING request only — no
 * funds move until an admin approves — so on success we refresh the request
 * history and the (possibly newly relevant) financial wallet. The mutation's
 * own `isPending` gates the submit button to avoid duplicate requests.
 */
export function useCreateDeposit(): UseMutationResult<
  FinancialRequestData,
  ApiError,
  CreateDepositInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepositInput) => financeApi.createDeposit(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walletKeys.financeRequests });
      void queryClient.invalidateQueries({ queryKey: walletKeys.financial });
    },
  });
}

/**
 * Submits a withdrawal request. Like deposits, the backend creates a PENDING
 * request only — the wallet is debited atomically at approval, never here — so
 * on success we refresh the request history and the financial wallet balance.
 * The mutation's `isPending` gates the submit button against duplicate requests.
 */
export function useCreateWithdrawal(): UseMutationResult<
  FinancialRequestData,
  ApiError,
  CreateWithdrawalInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWithdrawalInput) => financeApi.createWithdrawal(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walletKeys.financeRequests });
      void queryClient.invalidateQueries({ queryKey: walletKeys.financial });
    },
  });
}
