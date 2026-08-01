import type { z } from 'zod';

import type { PaginatedResult } from '@/database/types';

import type {
  createFeatureToggleSchema,
  historyQuerySchema,
  listSettingsQuerySchema,
  maintenanceSchema,
  updateBrandingSchema,
  updateFeatureToggleSchema,
  updateSettingsSchema,
} from '../validators';

export type SettingValueType =
  'STRING' | 'NUMBER' | 'BOOLEAN' | 'COLOR' | 'SELECT' | 'JSON' | 'ARRAY';

export interface SettingData {
  id: string;
  categoryCode: string;
  key: string;
  label: string;
  description: string | null;
  /** Redacted (null) in reads when `isSecret`; `hasValue` still indicates presence. */
  value: unknown;
  valueType: SettingValueType;
  isSecret: boolean;
  isPublic: boolean;
  isSystem: boolean;
  hasValue: boolean;
  options: readonly string[] | null;
  version: number;
  updatedAt: Date;
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
  createdAt: Date;
}

export interface FeatureToggleData {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  strategy: Record<string, unknown> | null;
  updatedAt: Date;
}

export interface MaintenanceWindowData {
  id: string;
  title: string;
  message: string;
  isActive: boolean;
  allowAdminBypass: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
}

export interface MaintenanceStatus {
  active: boolean;
  window: MaintenanceWindowData | null;
}

export interface PublicSettings {
  settings: Record<string, unknown>;
  maintenance: { active: boolean; title: string; message: string } | null;
}

export type PaginatedHistory = PaginatedResult<SettingHistoryData>;

export type ListSettingsQuery = z.infer<typeof listSettingsQuerySchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type CreateFeatureToggleInput = z.infer<typeof createFeatureToggleSchema>;
export type UpdateFeatureToggleInput = z.infer<typeof updateFeatureToggleSchema>;
export type MaintenanceInput = z.infer<typeof maintenanceSchema>;

/** Actor + request context for auditing and authorship. */
export interface SettingActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}
