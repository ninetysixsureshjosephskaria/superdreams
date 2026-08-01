CREATE TYPE "public"."reward_expiry_policy" AS ENUM('FIXED_DATE', 'ROLLING', 'NEVER');--> statement-breakpoint
CREATE TYPE "public"."reward_program_status" AS ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."reward_redemption_status" AS ENUM('PENDING', 'COMPLETED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."reward_rule_type" AS ENUM('FIXED', 'PERCENTAGE', 'TIER', 'EVENT', 'MANUAL', 'PROMOTIONAL');--> statement-breakpoint
CREATE TYPE "public"."reward_transaction_direction" AS ENUM('CREDIT', 'DEBIT');--> statement-breakpoint
CREATE TYPE "public"."reward_transaction_status" AS ENUM('POSTED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."reward_transaction_type" AS ENUM('EARN', 'REDEEM', 'ADJUSTMENT', 'EXPIRE', 'REVERSAL');--> statement-breakpoint
CREATE TABLE "member_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"member_id" uuid NOT NULL,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"lifetime_earned" integer DEFAULT 0 NOT NULL,
	"lifetime_redeemed" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"member_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"direction" "reward_transaction_direction" NOT NULL,
	"points" integer NOT NULL,
	"reason" text NOT NULL,
	"approved_by" uuid
);
--> statement-breakpoint
CREATE TABLE "reward_categories" (
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
CREATE TABLE "reward_expiry_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"program_id" uuid,
	"policy" "reward_expiry_policy" DEFAULT 'NEVER' NOT NULL,
	"fixed_date" timestamp with time zone,
	"rolling_days" integer,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"action" text NOT NULL,
	"description" text,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_programs" (
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
	"type" "reward_rule_type" NOT NULL,
	"category_id" uuid,
	"status" "reward_program_status" DEFAULT 'DRAFT' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"points_per_unit" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "reward_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"member_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"points" integer NOT NULL,
	"status" "reward_redemption_status" DEFAULT 'COMPLETED' NOT NULL,
	"note" text,
	"wallet_transaction_id" uuid,
	"processed_by" uuid
);
--> statement-breakpoint
CREATE TABLE "reward_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"program_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "reward_rule_type" NOT NULL,
	"points" integer,
	"rate_basis_points" integer,
	"config" jsonb,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"program_id" uuid,
	"rule_id" uuid,
	"reference" text NOT NULL,
	"type" "reward_transaction_type" NOT NULL,
	"direction" "reward_transaction_direction" NOT NULL,
	"status" "reward_transaction_status" DEFAULT 'POSTED' NOT NULL,
	"points" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"description" text,
	"redemption_id" uuid,
	"reversal_of_id" uuid,
	"expires_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"code" "reward_rule_type" NOT NULL,
	"label" text NOT NULL,
	"description" text
);
--> statement-breakpoint
ALTER TABLE "member_rewards" ADD CONSTRAINT "member_rewards_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_adjustments" ADD CONSTRAINT "reward_adjustments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_adjustments" ADD CONSTRAINT "reward_adjustments_transaction_id_reward_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."reward_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_expiry_rules" ADD CONSTRAINT "reward_expiry_rules_program_id_reward_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."reward_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_history" ADD CONSTRAINT "reward_history_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_programs" ADD CONSTRAINT "reward_programs_category_id_reward_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."reward_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_transaction_id_reward_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."reward_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_rules" ADD CONSTRAINT "reward_rules_program_id_reward_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."reward_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_program_id_reward_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."reward_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_rule_id_reward_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."reward_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "member_rewards_member_id_uq" ON "member_rewards" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "reward_adjustments_member_id_idx" ON "reward_adjustments" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reward_categories_code_uq" ON "reward_categories" USING btree ("code");--> statement-breakpoint
CREATE INDEX "reward_expiry_rules_program_id_idx" ON "reward_expiry_rules" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "reward_history_member_id_idx" ON "reward_history" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reward_programs_code_uq" ON "reward_programs" USING btree ("code");--> statement-breakpoint
CREATE INDEX "reward_programs_status_idx" ON "reward_programs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reward_programs_type_idx" ON "reward_programs" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "reward_redemptions_reference_uq" ON "reward_redemptions" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "reward_redemptions_member_id_idx" ON "reward_redemptions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "reward_redemptions_status_idx" ON "reward_redemptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reward_rules_program_id_idx" ON "reward_rules" USING btree ("program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reward_transactions_reference_uq" ON "reward_transactions" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "reward_transactions_member_id_idx" ON "reward_transactions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "reward_transactions_member_created_idx" ON "reward_transactions" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "reward_transactions_type_idx" ON "reward_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "reward_transactions_program_id_idx" ON "reward_transactions" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "reward_transactions_expiry_idx" ON "reward_transactions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reward_types_code_uq" ON "reward_types" USING btree ("code");--> statement-breakpoint
INSERT INTO "reward_types" ("code", "label", "description") VALUES
	('FIXED', 'Fixed', 'A flat number of points per qualifying event.'),
	('PERCENTAGE', 'Percentage', 'Points as a percentage of a base value.'),
	('TIER', 'Tier-based', 'Points that vary by member tier or threshold.'),
	('EVENT', 'Event-triggered', 'Points triggered by a platform event.'),
	('MANUAL', 'Manual', 'Points allocated manually by staff.'),
	('PROMOTIONAL', 'Promotional', 'Points from a time-bound promotion.');--> statement-breakpoint
INSERT INTO "reward_categories" ("code", "label", "description") VALUES
	('GENERAL', 'General', 'Everyday earning programs.'),
	('PROMOTIONAL', 'Promotional', 'Limited-time promotional programs.'),
	('SEASONAL', 'Seasonal', 'Seasonal or holiday programs.'),
	('LOYALTY', 'Loyalty', 'Long-term loyalty and tier programs.');
