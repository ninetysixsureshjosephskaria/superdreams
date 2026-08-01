CREATE TYPE "public"."report_export_format" AS ENUM('CSV', 'XLSX', 'PDF');--> statement-breakpoint
CREATE TYPE "public"."report_schedule_frequency" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."report_widget_type" AS ENUM('KPI', 'CHART', 'TABLE', 'SUMMARY', 'ACTIVITY');--> statement-breakpoint
CREATE TABLE "dashboard_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"user_id" uuid NOT NULL,
	"layout" jsonb
);
--> statement-breakpoint
CREATE TABLE "dashboard_widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"code" text NOT NULL,
	"type" "report_widget_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"config" jsonb,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"user_id" uuid NOT NULL,
	"definition_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_categories" (
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
	"description" text
);
--> statement-breakpoint
CREATE TABLE "report_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category_id" uuid,
	"source" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_execution_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_code" text NOT NULL,
	"trigger" text DEFAULT 'RUN' NOT NULL,
	"status" "job_status" DEFAULT 'COMPLETED' NOT NULL,
	"filters" jsonb,
	"row_count" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"error" text,
	"run_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"report_code" text NOT NULL,
	"format" "report_export_format" DEFAULT 'CSV' NOT NULL,
	"status" "job_status" DEFAULT 'PENDING' NOT NULL,
	"filters" jsonb,
	"row_count" integer DEFAULT 0 NOT NULL,
	"content" text,
	"content_type" text,
	"file_name" text,
	"error" text,
	"requested_by" uuid,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"report_code" text NOT NULL,
	"name" text NOT NULL,
	"frequency" "report_schedule_frequency" DEFAULT 'DAILY' NOT NULL,
	"cron" text,
	"filters" jsonb,
	"format" "report_export_format" DEFAULT 'CSV' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"next_run_at" timestamp with time zone,
	"last_run_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"definition_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"filters" jsonb,
	"is_shared" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"user_id" uuid NOT NULL,
	"report_code" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb
);
--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_reports" ADD CONSTRAINT "favorite_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_reports" ADD CONSTRAINT "favorite_reports_definition_id_report_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."report_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_category_id_report_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."report_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_definition_id_report_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."report_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_layouts_user_id_uq" ON "dashboard_layouts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_widgets_code_uq" ON "dashboard_widgets" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "favorite_reports_user_definition_uq" ON "favorite_reports" USING btree ("user_id","definition_id");--> statement-breakpoint
CREATE INDEX "favorite_reports_user_id_idx" ON "favorite_reports" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_categories_code_uq" ON "report_categories" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "report_definitions_code_uq" ON "report_definitions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "report_definitions_category_id_idx" ON "report_definitions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "report_definitions_source_idx" ON "report_definitions" USING btree ("source");--> statement-breakpoint
CREATE INDEX "report_execution_history_report_code_idx" ON "report_execution_history" USING btree ("report_code");--> statement-breakpoint
CREATE INDEX "report_execution_history_created_at_idx" ON "report_execution_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "report_execution_history_status_idx" ON "report_execution_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX "report_exports_report_code_idx" ON "report_exports" USING btree ("report_code");--> statement-breakpoint
CREATE INDEX "report_exports_status_idx" ON "report_exports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "report_exports_requested_by_idx" ON "report_exports" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "report_schedules_report_code_idx" ON "report_schedules" USING btree ("report_code");--> statement-breakpoint
CREATE INDEX "report_schedules_next_run_idx" ON "report_schedules" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "report_schedules_active_idx" ON "report_schedules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "reports_owner_id_idx" ON "reports" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "reports_definition_id_idx" ON "reports" USING btree ("definition_id");--> statement-breakpoint
CREATE INDEX "saved_filters_user_id_idx" ON "saved_filters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_filters_report_code_idx" ON "saved_filters" USING btree ("report_code");--> statement-breakpoint
INSERT INTO "report_categories" ("code", "label", "description") VALUES
	('OPERATIONAL', 'Operational', 'Day-to-day operational reports.'),
	('FINANCIAL', 'Financial', 'Wallet and monetary reports.'),
	('ENGAGEMENT', 'Engagement', 'Rewards and campaign engagement reports.'),
	('AUDIT', 'Audit & Compliance', 'Audit trail and activity reports.');--> statement-breakpoint
INSERT INTO "report_definitions" ("code", "name", "description", "source", "category_id")
SELECT d.code, d.name, d.description, d.source, c.id
FROM (VALUES
	('MEMBERS_SUMMARY', 'Members Summary', 'Member counts by status and new joins in a period.', 'MEMBERS', 'OPERATIONAL'),
	('WALLET_SUMMARY', 'Wallet Summary', 'Wallet balances and transaction flows in a period.', 'WALLET', 'FINANCIAL'),
	('REWARDS_SUMMARY', 'Rewards Summary', 'Reward point balances and earn/redeem activity.', 'REWARDS', 'ENGAGEMENT'),
	('CAMPAIGNS_SUMMARY', 'Campaigns Summary', 'Campaign status counts and execution outcomes.', 'CAMPAIGNS', 'ENGAGEMENT'),
	('NOTIFICATIONS_SUMMARY', 'Notifications Summary', 'Notification delivery outcomes by channel.', 'NOTIFICATIONS', 'OPERATIONAL'),
	('AUDIT_ACTIVITY', 'Audit Activity', 'Audit events grouped by module and action.', 'AUDIT', 'AUDIT'),
	('USER_ACTIVITY', 'User Activity', 'Most active users by audited actions.', 'USER_ACTIVITY', 'AUDIT')
) AS d(code, name, description, source, category_code)
JOIN "report_categories" c ON c.code = d.category_code;--> statement-breakpoint
INSERT INTO "dashboard_widgets" ("code", "type", "title", "description", "config") VALUES
	('KPI_TOTAL_MEMBERS', 'KPI', 'Total Members', 'Total and active members.', '{"kpi":"members"}'),
	('KPI_WALLET_BALANCE', 'KPI', 'Wallet Balance', 'Total available balance across wallets.', '{"kpi":"walletBalance"}'),
	('KPI_REWARD_POINTS', 'KPI', 'Reward Points', 'Outstanding reward points balance.', '{"kpi":"rewardPoints"}'),
	('KPI_ACTIVE_CAMPAIGNS', 'KPI', 'Active Campaigns', 'Currently active campaigns.', '{"kpi":"activeCampaigns"}'),
	('KPI_NOTIFICATIONS_DELIVERED', 'KPI', 'Notifications Delivered', 'Delivered notifications.', '{"kpi":"notificationsDelivered"}'),
	('SUMMARY_MEMBERS_BY_STATUS', 'SUMMARY', 'Members by Status', 'Member counts by status.', '{"report":"MEMBERS_SUMMARY"}'),
	('ACTIVITY_RECENT_AUDIT', 'ACTIVITY', 'Recent Activity', 'Latest audited actions across the platform.', '{"source":"audit","limit":10}');