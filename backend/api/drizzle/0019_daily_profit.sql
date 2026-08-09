CREATE TYPE "public"."profit_beneficiary_role" AS ENUM('MEMBER', 'PARTNER');--> statement-breakpoint
CREATE TYPE "public"."profit_schedule_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TABLE "profit_distribution_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"distribution_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"role" "profit_beneficiary_role" NOT NULL,
	"base_cents" bigint NOT NULL,
	"bps" integer NOT NULL,
	"amount_cents" bigint NOT NULL,
	"transaction_id" uuid
);
--> statement-breakpoint
CREATE TABLE "profit_distributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"day" date NOT NULL,
	"reference" text NOT NULL,
	"member_bps" integer NOT NULL,
	"partner_bps" integer NOT NULL,
	"member_amount_cents" bigint DEFAULT 0 NOT NULL,
	"partner_amount_cents" bigint DEFAULT 0 NOT NULL,
	"members_credited" integer DEFAULT 0 NOT NULL,
	"partners_credited" integer DEFAULT 0 NOT NULL,
	"distributed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profit_schedule_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"schedule_id" uuid NOT NULL,
	"day" date NOT NULL,
	"member_bps" integer DEFAULT 0 NOT NULL,
	"partner_bps" integer DEFAULT 0 NOT NULL,
	"distribute_at" text,
	"off" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profit_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"month" text NOT NULL,
	"status" "profit_schedule_status" DEFAULT 'DRAFT' NOT NULL,
	"member_monthly_bps" integer DEFAULT 0 NOT NULL,
	"partner_monthly_bps" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "profit_distribution_credits" ADD CONSTRAINT "profit_distribution_credits_distribution_id_profit_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."profit_distributions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_distribution_credits" ADD CONSTRAINT "profit_distribution_credits_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_distribution_credits" ADD CONSTRAINT "profit_distribution_credits_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_schedule_days" ADD CONSTRAINT "profit_schedule_days_schedule_id_profit_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."profit_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profit_distribution_credits_dist_member_uq" ON "profit_distribution_credits" USING btree ("distribution_id","member_id");--> statement-breakpoint
CREATE INDEX "profit_distribution_credits_member_idx" ON "profit_distribution_credits" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profit_distributions_day_uq" ON "profit_distributions" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "profit_distributions_reference_uq" ON "profit_distributions" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "profit_schedule_days_schedule_day_uq" ON "profit_schedule_days" USING btree ("schedule_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "profit_schedules_month_uq" ON "profit_schedules" USING btree ("month");