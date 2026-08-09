import type { ListInvitesParams } from '@superdreams/api-client';

/** Hierarchical query-key factory for the admin network / invites surface. */
export const networkKeys = {
  all: ['network'] as const,
  partners: () => [...networkKeys.all, 'partners'] as const,
  member: (id: string) => [...networkKeys.all, 'member', id] as const,
  invites: () => [...networkKeys.all, 'invites'] as const,
  inviteList: (params: ListInvitesParams) => [...networkKeys.invites(), params] as const,
};
