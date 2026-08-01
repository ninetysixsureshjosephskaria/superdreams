import { apiClient } from '@/services';
import { createMembersApi } from '@superdreams/api-client';

/** Member Management API bound to the app's configured client. */
export const membersApi = createMembersApi(apiClient);
