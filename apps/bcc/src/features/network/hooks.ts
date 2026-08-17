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
  CreateInviteInput,
  Invite,
  ListInvitesParams,
  NetworkMemberDetail,
  PaginatedInvites,
  PartnerNetworkSummary,
} from '@superdreams/api-client';

import { networkApi } from './api';
import { networkKeys } from './query-keys';

/**
 * All partners with their network summary (requires network.read). Pass
 * `{ enabled: false }` to defer the fetch until it is actually needed (e.g. the
 * Member-invite Partner selector only loads partners when a Member invite is
 * being composed).
 */
export function usePartners(options?: {
  enabled?: boolean;
}): UseQueryResult<PartnerNetworkSummary[], ApiError> {
  return useQuery({
    queryKey: networkKeys.partners(),
    queryFn: () => networkApi.listPartners(),
    enabled: options?.enabled ?? true,
  });
}

/** A single member's network node (relationships + counts + units). */
export function useNetworkMember(id: string): UseQueryResult<NetworkMemberDetail, ApiError> {
  return useQuery({
    queryKey: networkKeys.member(id),
    queryFn: () => networkApi.getMemberNode(id),
    enabled: id !== '',
    retry: (failureCount, error) => error.status !== 404 && failureCount < 1,
  });
}

/** Invites list (requires invite.send). */
export function useInvites(params: ListInvitesParams): UseQueryResult<PaginatedInvites, ApiError> {
  return useQuery({
    queryKey: networkKeys.inviteList(params),
    queryFn: () => networkApi.listInvites(params),
    placeholderData: keepPreviousData,
  });
}

function useInviteInvalidation(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: networkKeys.invites() });
  };
}

/** Creates an invite (requires invite.send). */
export function useCreateInvite(): UseMutationResult<Invite, ApiError, CreateInviteInput> {
  const invalidate = useInviteInvalidation();
  return useMutation({
    mutationFn: (input: CreateInviteInput) => networkApi.createInvite(input),
    onSuccess: invalidate,
  });
}

/** Revokes an invite by code. */
export function useRevokeInvite(): UseMutationResult<Invite, ApiError, string> {
  const invalidate = useInviteInvalidation();
  return useMutation({
    mutationFn: (code: string) => networkApi.revokeInvite(code),
    onSuccess: invalidate,
  });
}

/** Deletes an invite by code. */
export function useDeleteInvite(): UseMutationResult<
  { code: string; deleted: boolean },
  ApiError,
  string
> {
  const invalidate = useInviteInvalidation();
  return useMutation({
    mutationFn: (code: string) => networkApi.deleteInvite(code),
    onSuccess: invalidate,
  });
}
