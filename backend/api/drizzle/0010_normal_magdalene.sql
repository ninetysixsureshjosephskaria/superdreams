CREATE TYPE "public"."setting_value_type" AS ENUM('STRING', 'NUMBER', 'BOOLEAN', 'COLOR', 'SELECT', 'JSON', 'ARRAY');--> statement-breakpoint
CREATE TABLE "feature_toggles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"strategy" jsonb
);
--> statement-breakpoint
CREATE TABLE "maintenance_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"allow_admin_bypass" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"activated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "setting_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setting_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_id" uuid,
	"key" text NOT NULL,
	"category_code" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"category_id" uuid NOT NULL,
	"category_code" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"value" jsonb,
	"value_type" "setting_value_type" DEFAULT 'STRING' NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maintenance_windows" ADD CONSTRAINT "maintenance_windows_activated_by_users_id_fk" FOREIGN KEY ("activated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setting_history" ADD CONSTRAINT "setting_history_setting_id_system_settings_id_fk" FOREIGN KEY ("setting_id") REFERENCES "public"."system_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_category_id_setting_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."setting_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feature_toggles_key_uq" ON "feature_toggles" USING btree ("key");--> statement-breakpoint
CREATE INDEX "feature_toggles_enabled_idx" ON "feature_toggles" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "maintenance_windows_active_idx" ON "maintenance_windows" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "setting_categories_code_uq" ON "setting_categories" USING btree ("code");--> statement-breakpoint
CREATE INDEX "setting_history_key_idx" ON "setting_history" USING btree ("key");--> statement-breakpoint
CREATE INDEX "setting_history_category_idx" ON "setting_history" USING btree ("category_code");--> statement-breakpoint
CREATE INDEX "setting_history_created_at_idx" ON "setting_history" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "system_settings_key_uq" ON "system_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "system_settings_category_idx" ON "system_settings" USING btree ("category_code");--> statement-breakpoint
INSERT INTO "setting_categories" ("code", "label", "description", "sort_order") VALUES
	('GENERAL', 'General', 'Core platform identity and defaults.', 10),
	('BRANDING', 'Branding', 'Logo, colors and theme.', 20),
	('LOCALIZATION', 'Localization', 'Language, timezone, currency and formats.', 30),
	('SECURITY', 'Security', 'Password policy, sessions and token lifetimes.', 40),
	('EMAIL', 'Email', 'Outbound email configuration.', 50),
	('SMS', 'SMS', 'Outbound SMS configuration.', 60),
	('NOTIFICATIONS', 'Notifications', 'Notification delivery defaults.', 70),
	('WALLET', 'Wallet', 'Wallet configuration defaults.', 80),
	('REWARDS', 'Rewards', 'Rewards configuration defaults.', 90),
	('CAMPAIGNS', 'Campaigns', 'Campaign configuration defaults.', 100),
	('REPORTS', 'Reports', 'Reporting configuration defaults.', 110),
	('API', 'API', 'API rate limits and CORS.', 120),
	('INTEGRATIONS', 'Integrations', 'External integration metadata.', 130),
	('BACKUP', 'Backup', 'Backup schedule and retention metadata.', 140),
	('AUDIT', 'Audit', 'Audit logging configuration.', 150);--> statement-breakpoint
INSERT INTO "system_settings" ("category_id", "category_code", "key", "label", "description", "value", "value_type", "is_secret", "is_public")
SELECT c.id, s.category_code, s.key, s.label, s.description, s.value::jsonb, s.value_type::"public"."setting_value_type", s.is_secret, s.is_public
FROM (VALUES
	('GENERAL', 'platform.name', 'Platform name', 'The displayed platform name.', '"Super Dreams"', 'STRING', false, true),
	('GENERAL', 'platform.supportEmail', 'Support email', 'Address shown for support enquiries.', '"support@superdreams.local"', 'STRING', false, true),
	('GENERAL', 'platform.tagline', 'Tagline', 'Short platform tagline.', '"Loyalty, wallet and rewards platform"', 'STRING', false, true),
	('BRANDING', 'branding.logoUrl', 'Logo URL', 'URL of the platform logo.', '""', 'STRING', false, true),
	('BRANDING', 'branding.faviconUrl', 'Favicon URL', 'URL of the favicon.', '""', 'STRING', false, true),
	('BRANDING', 'branding.primaryColor', 'Primary color', 'Primary brand color.', '"#4f46e5"', 'COLOR', false, true),
	('BRANDING', 'branding.secondaryColor', 'Secondary color', 'Secondary brand color.', '"#0ea5e9"', 'COLOR', false, true),
	('BRANDING', 'branding.theme', 'Default theme', 'Default UI theme.', '"system"', 'SELECT', false, true),
	('LOCALIZATION', 'localization.defaultLanguage', 'Default language', 'Default platform language.', '"en"', 'SELECT', false, true),
	('LOCALIZATION', 'localization.supportedLanguages', 'Supported languages', 'Enabled languages.', '["en"]', 'ARRAY', false, true),
	('LOCALIZATION', 'localization.timezone', 'Timezone', 'Default timezone.', '"UTC"', 'STRING', false, true),
	('LOCALIZATION', 'localization.currency', 'Currency', 'Default currency code.', '"USD"', 'STRING', false, true),
	('LOCALIZATION', 'localization.dateFormat', 'Date format', 'Default date format.', '"YYYY-MM-DD"', 'STRING', false, true),
	('LOCALIZATION', 'localization.numberFormat', 'Number format', 'Default number format.', '"1,234.56"', 'SELECT', false, true),
	('SECURITY', 'security.passwordMinLength', 'Password minimum length', 'Minimum password length.', '12', 'NUMBER', false, false),
	('SECURITY', 'security.passwordRequireUppercase', 'Require uppercase', 'Require an uppercase letter.', 'true', 'BOOLEAN', false, false),
	('SECURITY', 'security.passwordRequireLowercase', 'Require lowercase', 'Require a lowercase letter.', 'true', 'BOOLEAN', false, false),
	('SECURITY', 'security.passwordRequireNumber', 'Require number', 'Require a number.', 'true', 'BOOLEAN', false, false),
	('SECURITY', 'security.passwordRequireSpecial', 'Require special character', 'Require a special character.', 'true', 'BOOLEAN', false, false),
	('SECURITY', 'security.sessionTimeoutMinutes', 'Session timeout (minutes)', 'Idle session timeout.', '60', 'NUMBER', false, false),
	('SECURITY', 'security.maxLoginAttempts', 'Max login attempts', 'Attempts before lockout.', '5', 'NUMBER', false, false),
	('SECURITY', 'security.mfaEnabled', 'MFA enabled', 'Whether MFA is enabled platform-wide.', 'false', 'BOOLEAN', false, false),
	('SECURITY', 'security.accessTokenTtlSeconds', 'Access token TTL (seconds)', 'Access token lifetime.', '86400', 'NUMBER', false, false),
	('SECURITY', 'security.refreshTokenTtlDays', 'Refresh token TTL (days)', 'Refresh token lifetime.', '30', 'NUMBER', false, false),
	('EMAIL', 'email.provider', 'Email provider', 'Outbound email provider.', '"mock"', 'SELECT', false, false),
	('EMAIL', 'email.fromName', 'From name', 'Sender display name.', '"Super Dreams"', 'STRING', false, false),
	('EMAIL', 'email.fromAddress', 'From address', 'Sender address.', '"no-reply@superdreams.local"', 'STRING', false, false),
	('EMAIL', 'email.smtpHost', 'SMTP host', 'SMTP server host.', '""', 'STRING', false, false),
	('EMAIL', 'email.smtpPort', 'SMTP port', 'SMTP server port.', '587', 'NUMBER', false, false),
	('EMAIL', 'email.smtpPassword', 'SMTP password', 'SMTP password.', '""', 'STRING', true, false),
	('SMS', 'sms.provider', 'SMS provider', 'Outbound SMS provider.', '"mock"', 'SELECT', false, false),
	('SMS', 'sms.senderId', 'Sender ID', 'SMS sender identifier.', '"SUPERDREAMS"', 'STRING', false, false),
	('SMS', 'sms.apiKey', 'SMS API key', 'SMS provider API key.', '""', 'STRING', true, false),
	('NOTIFICATIONS', 'notifications.defaultChannel', 'Default channel', 'Default notification channel.', '"IN_APP"', 'SELECT', false, false),
	('NOTIFICATIONS', 'notifications.digestEnabled', 'Digest enabled', 'Enable notification digests.', 'false', 'BOOLEAN', false, false),
	('NOTIFICATIONS', 'notifications.maxRetries', 'Max delivery retries', 'Delivery retry attempts.', '3', 'NUMBER', false, false),
	('WALLET', 'wallet.defaultCurrency', 'Default currency', 'Default wallet currency.', '"USD"', 'STRING', false, false),
	('WALLET', 'wallet.allowNegativeBalance', 'Allow negative balance', 'Permit negative balances.', 'false', 'BOOLEAN', false, false),
	('WALLET', 'wallet.maxBalanceMinor', 'Max balance (minor units)', 'Maximum wallet balance.', '100000000', 'NUMBER', false, false),
	('REWARDS', 'rewards.defaultExpiryDays', 'Default points expiry (days)', 'Default reward point expiry.', '365', 'NUMBER', false, false),
	('REWARDS', 'rewards.allowManualAdjustments', 'Allow manual adjustments', 'Permit manual point adjustments.', 'true', 'BOOLEAN', false, false),
	('CAMPAIGNS', 'campaigns.maxActive', 'Max active campaigns', 'Concurrent active campaign limit.', '25', 'NUMBER', false, false),
	('CAMPAIGNS', 'campaigns.defaultType', 'Default campaign type', 'Default campaign type.', '"PROMOTIONAL"', 'SELECT', false, false),
	('REPORTS', 'reports.defaultExportFormat', 'Default export format', 'Default report export format.', '"CSV"', 'SELECT', false, false),
	('REPORTS', 'reports.historyRetentionDays', 'History retention (days)', 'Report history retention.', '365', 'NUMBER', false, false),
	('API', 'api.rateLimitPerMinute', 'Rate limit (per minute)', 'API requests per minute.', '120', 'NUMBER', false, false),
	('API', 'api.corsOrigins', 'CORS origins', 'Allowed CORS origins.', '["*"]', 'ARRAY', false, false),
	('INTEGRATIONS', 'integrations.webhookUrl', 'Webhook URL', 'Outbound webhook endpoint.', '""', 'STRING', false, false),
	('INTEGRATIONS', 'integrations.webhookSecret', 'Webhook secret', 'Webhook signing secret.', '""', 'STRING', true, false),
	('BACKUP', 'backup.schedule', 'Backup schedule', 'Backup cadence.', '"daily"', 'SELECT', false, false),
	('BACKUP', 'backup.retentionDays', 'Backup retention (days)', 'Backup retention window.', '30', 'NUMBER', false, false),
	('BACKUP', 'backup.storageProvider', 'Storage provider', 'Backup storage provider.', '"local"', 'STRING', false, false),
	('AUDIT', 'audit.retentionDays', 'Audit retention (days)', 'Audit log retention window.', '365', 'NUMBER', false, false),
	('AUDIT', 'audit.logReadOperations', 'Log read operations', 'Audit read operations too.', 'false', 'BOOLEAN', false, false)
) AS s(category_code, key, label, description, value, value_type, is_secret, is_public)
JOIN "setting_categories" c ON c.code = s.category_code;--> statement-breakpoint
INSERT INTO "feature_toggles" ("key", "name", "description", "enabled") VALUES
	('reports.xlsxExports', 'XLSX report exports', 'Enable binary XLSX export rendering.', false),
	('notifications.digest', 'Notification digests', 'Enable batched notification digests.', false),
	('campaigns.autoEnroll', 'Campaign auto-enroll', 'Automatically enroll eligible members.', false),
	('portal.darkMode', 'Portal dark mode', 'Allow members to switch to dark mode.', true);