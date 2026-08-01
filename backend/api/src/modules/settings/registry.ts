/**
 * Code-defined metadata for known settings. The database holds the authoritative
 * values; this registry supplies the extra validation constraints (SELECT
 * options, numeric bounds) that a value's `valueType` alone cannot express, plus
 * typed default fallbacks used when a key is absent. Adding a setting = seed a
 * `system_settings` row and (optionally) register options/bounds/defaults here.
 */

/** Allowed values for SELECT-typed settings, keyed by setting key. */
export const SELECT_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  'branding.theme': ['light', 'dark', 'system'],
  'localization.defaultLanguage': ['en', 'es', 'fr', 'de', 'ar'],
  'localization.numberFormat': ['1,234.56', '1.234,56', '1 234,56'],
  'email.provider': ['mock', 'smtp', 'ses', 'sendgrid'],
  'sms.provider': ['mock', 'twilio', 'sns'],
  'notifications.defaultChannel': ['IN_APP', 'EMAIL', 'SMS', 'PUSH'],
  'campaigns.defaultType': ['PROMOTIONAL', 'REWARD', 'REFERRAL', 'SEASONAL', 'ENGAGEMENT'],
  'reports.defaultExportFormat': ['CSV', 'XLSX', 'PDF'],
  'backup.schedule': ['off', 'daily', 'weekly', 'monthly'],
};

/** Inclusive numeric bounds for NUMBER-typed settings, keyed by setting key. */
export const NUMBER_BOUNDS: Readonly<Record<string, { min?: number; max?: number }>> = {
  'security.passwordMinLength': { min: 6, max: 128 },
  'security.sessionTimeoutMinutes': { min: 1, max: 1440 },
  'security.maxLoginAttempts': { min: 1, max: 100 },
  'security.accessTokenTtlSeconds': { min: 60, max: 2_592_000 },
  'security.refreshTokenTtlDays': { min: 1, max: 365 },
  'notifications.maxRetries': { min: 0, max: 10 },
  'wallet.maxBalanceMinor': { min: 0 },
  'rewards.defaultExpiryDays': { min: 0, max: 3_650 },
  'campaigns.maxActive': { min: 1, max: 1_000 },
  'reports.historyRetentionDays': { min: 1, max: 3_650 },
  'api.rateLimitPerMinute': { min: 1, max: 100_000 },
  'backup.retentionDays': { min: 1, max: 3_650 },
  'audit.retentionDays': { min: 1, max: 3_650 },
  'email.smtpPort': { min: 1, max: 65_535 },
};

export function selectOptionsFor(key: string): readonly string[] | undefined {
  return SELECT_OPTIONS[key];
}

export function numberBoundsFor(key: string): { min?: number; max?: number } | undefined {
  return NUMBER_BOUNDS[key];
}
