import type {
  ListProgramsParams,
  ListRewardTransactionsParams,
  MemberHistoryParams,
} from '@superdreams/api-client';

/** TanStack Query keys for the rewards feature (predictable cache invalidation). */
export const rewardKeys = {
  all: ['rewards'] as const,
  programs: () => [...rewardKeys.all, 'programs'] as const,
  programList: (params: ListProgramsParams) => [...rewardKeys.programs(), 'list', params] as const,
  program: (id: string) => [...rewardKeys.programs(), id] as const,
  members: () => [...rewardKeys.all, 'members'] as const,
  member: (memberId: string) => [...rewardKeys.members(), memberId] as const,
  memberHistory: (memberId: string, params: MemberHistoryParams) =>
    [...rewardKeys.member(memberId), 'history', params] as const,
  transactions: (params: ListRewardTransactionsParams) =>
    [...rewardKeys.all, 'transactions', params] as const,
};
