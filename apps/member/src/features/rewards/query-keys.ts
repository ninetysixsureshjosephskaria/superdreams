import type { MemberHistoryParams } from '@superdreams/api-client';

/** TanStack Query keys for the member's own rewards. */
export const rewardKeys = {
  all: ['rewards'] as const,
  me: ['rewards', 'me'] as const,
  history: (params: MemberHistoryParams) => ['rewards', 'me', 'history', params] as const,
};
