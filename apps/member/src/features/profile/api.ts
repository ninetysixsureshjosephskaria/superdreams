import { apiClient } from '@/services';
import { createMembersApi } from '@superdreams/api-client';

/** Member Management API bound to the portal's configured client. */
export const membersApi = createMembersApi(apiClient);
