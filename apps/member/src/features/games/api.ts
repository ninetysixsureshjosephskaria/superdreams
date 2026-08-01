import { apiClient } from '@/services';
import { createGamesApi } from '@superdreams/api-client';

/** Games API bound to the portal's configured client. */
export const gamesApi = createGamesApi(apiClient);
