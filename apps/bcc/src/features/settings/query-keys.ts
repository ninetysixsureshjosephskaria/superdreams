import type { ListSettingsParams, SettingsHistoryParams } from '@superdreams/api-client';

/** TanStack Query keys for the settings feature. */
export const settingKeys = {
  all: ['settings'] as const,
  list: (params: ListSettingsParams) => [...settingKeys.all, 'list', params] as const,
  categories: () => [...settingKeys.all, 'categories'] as const,
  history: (params: SettingsHistoryParams) => [...settingKeys.all, 'history', params] as const,
  featureToggles: () => [...settingKeys.all, 'feature-toggles'] as const,
  maintenance: () => [...settingKeys.all, 'maintenance'] as const,
};
