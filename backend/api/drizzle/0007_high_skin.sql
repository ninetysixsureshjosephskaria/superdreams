CREATE TYPE "public"."campaign_audience_type" AS ENUM('ALL_MEMBERS', 'SEGMENT', 'MANUAL', 'STATUS', 'JOIN_DATE');--> statement-breakpoint
CREATE TYPE "public"."campaign_participation_status" AS ENUM('ELIGIBLE', 'ENROLLED', 'REWARDED', 'EXCLUDED');--> statement-breakpoint
CREATE TYPE "public"."campaign_rule_type" AS ENUM('MEMBER_STATUS', 'JOIN_DATE_AFTER', 'JOIN_DATE_BEFORE', 'REWARD_ELIGIBILITY', 'SEGMENT');--> statement-breakpoint
CREATE TYPE "public"."campaign_schedule_type" AS ENUM('IMMEDIATE', 'SCHEDULED', 'RECURRING');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('PROMOTIONAL', 'REWARD', 'REFERRAL', 'SEASONAL', 'ENGAGEMENT');--> statement-breakpoint
CREATE TABLE "campaign_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'COMPLETED' NOT NULL,
	"members_targeted" integer DEFAULT 0 NOT NULL,
	"rewards_issued" integer DEFAULT 0 NOT NULL,
	"points_issued" integer DEFAULT 0 NOT NULL,
	"error" text,
	"executed_by" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"action" text NOT NULL,
	"description" text,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_member_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"campaign_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"status" "campaign_participation_status" DEFAULT 'ELIGIBLE' NOT NULL,
	"enrolled_at" timestamp with time zone,
	"rewarded_at" timestamp with time zone,
	"reward_transaction_id" uuid
);
--> statement-breakpoint
CREATE TABLE "campaign_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"campaign_id" uuid NOT NULL,
	"reward_program_id" uuid,
	"points" integer NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "campaign_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"campaign_id" uuid NOT NULL,
	"type" "campaign_rule_type" NOT NULL,
	"value" text,
	"config" jsonb,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"campaign_id" uuid NOT NULL,
	"schedule_type" "campaign_schedule_type" DEFAULT 'IMMEDIATE' NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"recurrence_cron" text,
	"timezone" text,
	"next_run_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "campaign_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"definition" jsonb
);
--> statement-breakpoint
CREATE TABLE "campaign_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"campaign_id" uuid NOT NULL,
	"member_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"code" "campaign_type" NOT NULL,
	"label" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
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
	"type" "campaign_type" NOT NULL,
	"status" "campaign_status" DEFAULT 'DRAFT' NOT NULL,
	"audience_type" "campaign_audience_type" DEFAULT 'ALL_MEMBERS' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "campaign_executions" ADD CONSTRAINT "campaign_executions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_history" ADD CONSTRAINT "campaign_history_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_member_status" ADD CONSTRAINT "campaign_member_status_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_member_status" ADD CONSTRAINT "campaign_member_status_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_rewards" ADD CONSTRAINT "campaign_rewards_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_rewards" ADD CONSTRAINT "campaign_rewards_reward_program_id_reward_programs_id_fk" FOREIGN KEY ("reward_program_id") REFERENCES "public"."reward_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_rules" ADD CONSTRAINT "campaign_rules_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_schedules" ADD CONSTRAINT "campaign_schedules_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_segments" ADD CONSTRAINT "campaign_segments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_executions_campaign_id_idx" ON "campaign_executions" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_history_campaign_id_idx" ON "campaign_history" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_member_status_campaign_member_uq" ON "campaign_member_status" USING btree ("campaign_id","member_id");--> statement-breakpoint
CREATE INDEX "campaign_member_status_campaign_id_idx" ON "campaign_member_status" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_member_status_member_id_idx" ON "campaign_member_status" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "campaign_member_status_status_idx" ON "campaign_member_status" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaign_rewards_campaign_id_idx" ON "campaign_rewards" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_rules_campaign_id_idx" ON "campaign_rules" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_schedules_campaign_id_uq" ON "campaign_schedules" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_segments_campaign_id_idx" ON "campaign_segments" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_targets_campaign_member_uq" ON "campaign_targets" USING btree ("campaign_id","member_id");--> statement-breakpoint
CREATE INDEX "campaign_targets_campaign_id_idx" ON "campaign_targets" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_types_code_uq" ON "campaign_types" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_code_uq" ON "campaigns" USING btree ("code");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaigns_type_idx" ON "campaigns" USING btree ("type");--> statement-breakpoint
INSERT INTO "campaign_types" ("code", "label", "description") VALUES
	('PROMOTIONAL', 'Promotional', 'Time-bound promotional campaign.'),
	('REWARD', 'Reward', 'Campaign that issues reward points.'),
	('REFERRAL', 'Referral', 'Member referral campaign.'),
	('SEASONAL', 'Seasonal', 'Seasonal or holiday campaign.'),
	('ENGAGEMENT', 'Engagement', 'Member engagement campaign.');
