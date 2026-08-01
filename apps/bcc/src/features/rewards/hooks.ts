import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  AllocateInput,
  ApiError,
  ChangeRewardProgramStatusInput,
  CreateRewardProgramInput,
  ListProgramsParams,
  ListRewardTransactionsParams,
  MemberHistoryParams,
  MemberRewardBalance,
  PaginatedPrograms,
  PaginatedRewardTransactions,
  RedeemInput,
  RewardAdjustInput,
  RewardProgramDetail,
  RewardRedemptionData,
  RewardTransactionData,
  UpdateRewardProgramInput,
} from '@superdreams/api-client';

import { rewardsApi } from './api';
import { rewardKeys } from './query-keys';

export function usePrograms(
  params: ListProgramsParams,
): UseQueryResult<PaginatedPrograms, ApiError> {
  return useQuery({
    queryKey: rewardKeys.programList(params),
    queryFn: () => rewardsApi.listPrograms(params),
    placeholderData: keepPreviousData,
  });
}

export function useProgram(id: string): UseQueryResult<RewardProgramDetail, ApiError> {
  return useQuery({ queryKey: rewardKeys.program(id), queryFn: () => rewardsApi.getProgram(id) });
}

export function useMemberRewards(memberId: string): UseQueryResult<MemberRewardBalance, ApiError> {
  return useQuery({
    queryKey: rewardKeys.member(memberId),
    queryFn: () => rewardsApi.getMemberBalance(memberId),
    enabled: memberId.length > 0,
  });
}

export function useMemberRewardHistory(
  memberId: string,
  params: MemberHistoryParams,
): UseQueryResult<PaginatedRewardTransactions, ApiError> {
  return useQuery({
    queryKey: rewardKeys.memberHistory(memberId, params),
    queryFn: () => rewardsApi.getMemberHistory(memberId, params),
    enabled: memberId.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useRewardTransactions(
  params: ListRewardTransactionsParams,
): UseQueryResult<PaginatedRewardTransactions, ApiError> {
  return useQuery({
    queryKey: rewardKeys.transactions(params),
    queryFn: () => rewardsApi.listTransactions(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateProgram(): UseMutationResult<
  RewardProgramDetail,
  ApiError,
  CreateRewardProgramInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRewardProgramInput) => rewardsApi.createProgram(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardKeys.programs() });
    },
  });
}

export function useUpdateProgram(
  id: string,
): UseMutationResult<RewardProgramDetail, ApiError, UpdateRewardProgramInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRewardProgramInput) => rewardsApi.updateProgram(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardKeys.programs() });
    },
  });
}

export function useChangeProgramStatus(
  id: string,
): UseMutationResult<RewardProgramDetail, ApiError, ChangeRewardProgramStatusInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeRewardProgramStatusInput) =>
      rewardsApi.changeProgramStatus(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardKeys.programs() });
    },
  });
}

function useMemberInvalidation(memberId: string): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: rewardKeys.member(memberId) });
    void queryClient.invalidateQueries({ queryKey: rewardKeys.all });
  };
}

export function useAllocatePoints(
  memberId: string,
): UseMutationResult<RewardTransactionData, ApiError, AllocateInput> {
  const invalidate = useMemberInvalidation(memberId);
  return useMutation({
    mutationFn: (input: AllocateInput) => rewardsApi.allocate(memberId, input),
    onSuccess: invalidate,
  });
}

export function useRedeemPoints(
  memberId: string,
): UseMutationResult<RewardRedemptionData, ApiError, RedeemInput> {
  const invalidate = useMemberInvalidation(memberId);
  return useMutation({
    mutationFn: (input: RedeemInput) => rewardsApi.redeem(memberId, input),
    onSuccess: invalidate,
  });
}

export function useAdjustPoints(
  memberId: string,
): UseMutationResult<RewardTransactionData, ApiError, RewardAdjustInput> {
  const invalidate = useMemberInvalidation(memberId);
  return useMutation({
    mutationFn: (input: RewardAdjustInput) => rewardsApi.adjust(memberId, input),
    onSuccess: invalidate,
  });
}

export function useReverseRewardTransaction(
  memberId: string,
): UseMutationResult<RewardTransactionData, ApiError, string> {
  const invalidate = useMemberInvalidation(memberId);
  return useMutation({
    mutationFn: (transactionId: string) => rewardsApi.reverse(memberId, transactionId),
    onSuccess: invalidate,
  });
}
