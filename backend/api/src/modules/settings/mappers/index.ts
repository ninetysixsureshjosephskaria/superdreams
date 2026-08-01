import type {
  FeatureToggleData,
  MaintenanceWindowData,
  SettingCategoryData,
  SettingData,
  SettingHistoryData,
} from '../dto';
import { selectOptionsFor } from '../registry';
import type { CategoryRow } from '../repositories/category.repository';
import type { FeatureToggleRow } from '../repositories/feature-toggle.repository';
import type { HistoryRow } from '../repositories/history.repository';
import type { MaintenanceRow } from '../repositories/maintenance.repository';
import type { SettingRow } from '../repositories/settings.repository';

/**
 * Maps a setting row to its DTO. Secret values are redacted (never returned);
 * `hasValue` still signals whether a value is set so the UI can show state.
 */
export function toSetting(row: SettingRow): SettingData {
  const valueType = row.valueType;
  const hasValue = row.value != null && row.value !== '';
  return {
    id: row.id,
    categoryCode: row.categoryCode,
    key: row.key,
    label: row.label,
    description: row.description,
    value: row.isSecret ? null : row.value,
    valueType,
    isSecret: row.isSecret,
    isPublic: row.isPublic,
    isSystem: row.isSystem,
    hasValue,
    options: selectOptionsFor(row.key) ?? null,
    version: row.version,
    updatedAt: row.updatedAt,
  };
}

export function toCategory(row: CategoryRow): SettingCategoryData {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    description: row.description,
    sortOrder: row.sortOrder,
  };
}

export function toHistory(row: HistoryRow): SettingHistoryData {
  return {
    id: row.id,
    key: row.key,
    categoryCode: row.categoryCode,
    oldValue: row.oldValue,
    newValue: row.newValue,
    version: row.version,
    changedBy: row.changedBy,
    createdAt: row.createdAt,
  };
}

export function toFeatureToggle(row: FeatureToggleRow): FeatureToggleData {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    strategy: (row.strategy as Record<string, unknown> | null) ?? null,
    updatedAt: row.updatedAt,
  };
}

export function toMaintenanceWindow(row: MaintenanceRow): MaintenanceWindowData {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    isActive: row.isActive,
    allowAdminBypass: row.allowAdminBypass,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
  };
}
