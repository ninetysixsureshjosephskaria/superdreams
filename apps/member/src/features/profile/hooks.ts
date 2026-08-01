import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { ApiError, MemberDetail, UpdateOwnProfileInput } from '@superdreams/api-client';

import { membersApi } from './api';
import { profileKeys } from './query-keys';

export function useMyProfile(): UseQueryResult<MemberDetail, ApiError> {
  return useQuery({ queryKey: profileKeys.me, queryFn: () => membersApi.getMe(), retry: 1 });
}

export function useUpdateMyProfile(): UseMutationResult<
  MemberDetail,
  ApiError,
  UpdateOwnProfileInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOwnProfileInput) => membersApi.updateMe(input),
    onSuccess: (data) => {
      queryClient.setQueryData(profileKeys.me, data);
    },
  });
}
