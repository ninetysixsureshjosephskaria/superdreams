import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  AddDocumentInput,
  AddNoteInput,
  ApiError,
  ChangeStatusInput,
  CreateMemberInput,
  GenerateDemoMembersResult,
  ListMembersParams,
  MemberActivityData,
  MemberDetail,
  MemberDocumentData,
  MemberNoteData,
  MemberStatusHistoryData,
  PaginatedMembers,
  UpdateMemberInput,
} from '@superdreams/api-client';

import { membersApi } from './api';
import { memberKeys } from './query-keys';

export function useMembers(params: ListMembersParams): UseQueryResult<PaginatedMembers, ApiError> {
  return useQuery({
    queryKey: memberKeys.list(params),
    queryFn: () => membersApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useMember(id: string): UseQueryResult<MemberDetail, ApiError> {
  return useQuery({ queryKey: memberKeys.detail(id), queryFn: () => membersApi.get(id) });
}

export function useMemberActivity(id: string): UseQueryResult<MemberActivityData[], ApiError> {
  return useQuery({
    queryKey: memberKeys.activity(id),
    queryFn: () => membersApi.listActivity(id),
  });
}

export function useMemberNotes(id: string): UseQueryResult<MemberNoteData[], ApiError> {
  return useQuery({ queryKey: memberKeys.notes(id), queryFn: () => membersApi.listNotes(id) });
}

export function useMemberDocuments(id: string): UseQueryResult<MemberDocumentData[], ApiError> {
  return useQuery({
    queryKey: memberKeys.documents(id),
    queryFn: () => membersApi.listDocuments(id),
  });
}

export function useMemberStatusHistory(
  id: string,
): UseQueryResult<MemberStatusHistoryData[], ApiError> {
  return useQuery({
    queryKey: memberKeys.statusHistory(id),
    queryFn: () => membersApi.listStatusHistory(id),
  });
}

export function useCreateMember(): UseMutationResult<MemberDetail, ApiError, CreateMemberInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMemberInput) => membersApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useUpdateMember(
  id: string,
): UseMutationResult<MemberDetail, ApiError, UpdateMemberInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMemberInput) => membersApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useChangeMemberStatus(
  id: string,
): UseMutationResult<MemberDetail, ApiError, ChangeStatusInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeStatusInput) => membersApi.changeStatus(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: memberKeys.statusHistory(id) });
      void queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useArchiveMember(): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => membersApi.archive(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}

export function useAddMemberNote(
  id: string,
): UseMutationResult<MemberNoteData, ApiError, AddNoteInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddNoteInput) => membersApi.addNote(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberKeys.notes(id) });
      void queryClient.invalidateQueries({ queryKey: memberKeys.activity(id) });
    },
  });
}

export function useAddMemberDocument(
  id: string,
): UseMutationResult<MemberDocumentData, ApiError, AddDocumentInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddDocumentInput) => membersApi.addDocument(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberKeys.documents(id) });
      void queryClient.invalidateQueries({ queryKey: memberKeys.activity(id) });
    },
  });
}

/** Super Admin: idempotently generate demo members, then refresh the list. */
export function useGenerateDemoMembers(): UseMutationResult<
  GenerateDemoMembersResult,
  ApiError,
  number | undefined
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (count?: number) => membersApi.generateDemoMembers(count),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}
