import type { AxiosInstance } from 'axios';

/**
 * Settings & Administration API resource — the single, shared definition of the
 * settings HTTP contract used by every application (no duplicated API logic).
 * JSON dates are strings over the wire.
 */

export type SettingValueType =
  'STRING' | 'NUMBER' | 'BOOLEAN' | 'COLOR' | 'SELECT' | 'JSON' | 'ARRAY';

export interface SettingData {
  id: string;
  categoryCode: string;
  key: string;
  label: string;
  description: string | null;
  value: unknown;
  valueType: SettingValueType;
  isSecret: boolean;
  isPublic: boolean;
  isSystem: boolean;
  hasValue: boolean;
  options: string[] | null;
  version: number;
  updatedAt: string;
}

export interface SettingCategoryData {
  id: string;
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
}

export interface SettingHistoryData {
  id: string;
  key: string;
  categoryCode: string;
  oldValue: unknown;
  newValue: unknown;
  version: number;
  changedBy: string | null;
  createdAt: string;
}

export interface FeatureToggleData {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  strategy: Record<string, unknown> | null;
  updatedAt: string;
}

export interface MaintenanceWindowData {
  id: string;
  title: string;
  message: string;
  isActive: boolean;
  allowAdminBypass: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface MaintenanceStatus {
  active: boolean;
  window: MaintenanceWindowData | null;
}

export interface PublicSettings {
  settings: Record<string, unknown>;
  maintenance: { active: boolean; title: string; message: string } | null;
}

export interface SettingsPaginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListSettingsParams {
  category?: string;
  search?: string;
}

export interface SettingsHistoryParams {
  page?: number;
  pageSize?: number;
  key?: string;
  category?: string;
}

export interface UpdateSettingsInput {
  updates: Record<string, unknown>;
}

export interface UpdateBrandingInput {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  theme?: string;
}

export interface CreateFeatureToggleInput {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  strategy?: Record<string, unknown>;
}

export interface UpdateFeatureToggleInput {
  name?: string;
  description?: string | null;
  enabled?: boolean;
  strategy?: Record<string, unknown> | null;
}

export interface MaintenanceInput {
  enabled: boolean;
  title?: string;
  message?: string;
  allowAdminBypass?: boolean;
  startsAt?: string;
  endsAt?: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface ItemsEnvelope<T> {
  success: boolean;
  data: { items: T[] };
}

export interface SettingsApi {
  list(params?: ListSettingsParams): Promise<SettingData[]>;
  update(updates: Record<string, unknown>): Promise<SettingData[]>;
  categories(): Promise<SettingCategoryData[]>;
  history(params?: SettingsHistoryParams): Promise<SettingsPaginated<SettingHistoryData>>;
  getBranding(): Promise<SettingData[]>;
  updateBranding(input: UpdateBrandingInput): Promise<SettingData[]>;
  featureToggles(): Promise<FeatureToggleData[]>;
  createFeatureToggle(input: CreateFeatureToggleInput): Promise<FeatureToggleData>;
  updateFeatureToggle(id: string, input: UpdateFeatureToggleInput): Promise<FeatureToggleData>;
  maintenance(): Promise<MaintenanceStatus>;
  setMaintenance(input: MaintenanceInput): Promise<MaintenanceStatus>;
  publicSettings(): Promise<PublicSettings>;
}

/** Binds the settings resource to a configured API client. */
export function createSettingsApi(client: AxiosInstance): SettingsApi {
  const base = '/api/v1';
  return {
    async list(params) {
      const response = await client.get<ItemsEnvelope<SettingData>>(`${base}/settings`, { params });
      return response.data.data.items;
    },
    async update(updates) {
      const response = await client.put<ItemsEnvelope<SettingData>>(`${base}/settings`, {
        updates,
      });
      return response.data.data.items;
    },
    async categories() {
      const response = await client.get<ItemsEnvelope<SettingCategoryData>>(
        `${base}/settings/categories`,
      );
      return response.data.data.items;
    },
    async history(params) {
      const response = await client.get<Envelope<SettingsPaginated<SettingHistoryData>>>(
        `${base}/settings/history`,
        { params },
      );
      return response.data.data;
    },
    async getBranding() {
      const response = await client.get<ItemsEnvelope<SettingData>>(`${base}/settings/branding`);
      return response.data.data.items;
    },
    async updateBranding(input) {
      const response = await client.put<ItemsEnvelope<SettingData>>(
        `${base}/settings/branding`,
        input,
      );
      return response.data.data.items;
    },
    async featureToggles() {
      const response = await client.get<ItemsEnvelope<FeatureToggleData>>(
        `${base}/settings/feature-toggles`,
      );
      return response.data.data.items;
    },
    async createFeatureToggle(input) {
      const response = await client.post<Envelope<FeatureToggleData>>(
        `${base}/settings/feature-toggles`,
        input,
      );
      return response.data.data;
    },
    async updateFeatureToggle(id, input) {
      const response = await client.patch<Envelope<FeatureToggleData>>(
        `${base}/settings/feature-toggles/${id}`,
        input,
      );
      return response.data.data;
    },
    async maintenance() {
      const response = await client.get<Envelope<MaintenanceStatus>>(
        `${base}/settings/maintenance`,
      );
      return response.data.data;
    },
    async setMaintenance(input) {
      const response = await client.post<Envelope<MaintenanceStatus>>(
        `${base}/settings/maintenance`,
        input,
      );
      return response.data.data;
    },
    async publicSettings() {
      const response = await client.get<Envelope<PublicSettings>>(`${base}/settings/public`);
      return response.data.data;
    },
  };
}
