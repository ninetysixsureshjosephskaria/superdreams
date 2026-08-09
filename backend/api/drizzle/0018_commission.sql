CREATE TYPE "public"."commission_earning_type" AS ENUM('COMMISSION', 'REFERRAL');--> statement-breakpoint
CREATE TABLE "commission_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"singleton" text DEFAULT 'SINGLETON' NOT NULL,
	"referral_rate_bps" integer DEFAULT 200 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"dedupe_key" text NOT NULL,
	"type" "commission_earning_type" NOT NULL,
	"deposit_request_id" uuid,
	"beneficiary_member_id" uuid NOT NULL,
	"source_member_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"rate_bps" integer NOT NULL,
	"network_units" integer,
	"transaction_id" uuid,
	"credited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"target_id" uuid,
	"from_units" integer NOT NULL,
	"to_units" integer,
	"rate_bps" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commission_earnings" ADD CONSTRAINT "commission_earnings_deposit_request_id_financial_requests_id_fk" FOREIGN KEY ("deposit_request_id") REFERENCES "public"."financial_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_earnings" ADD CONSTRAINT "commission_earnings_beneficiary_member_id_members_id_fk" FOREIGN KEY ("beneficiary_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_earnings" ADD CONSTRAINT "commission_earnings_source_member_id_members_id_fk" FOREIGN KEY ("source_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_tiers" ADD CONSTRAINT "commission_tiers_target_id_commission_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."commission_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commission_config_singleton_uq" ON "commission_config" USING btree ("singleton");--> statement-breakpoint
CREATE UNIQUE INDEX "commission_earnings_dedupe_key_uq" ON "commission_earnings" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "commission_earnings_beneficiary_idx" ON "commission_earnings" USING btree ("beneficiary_member_id");--> statement-breakpoint
CREATE INDEX "commission_earnings_source_idx" ON "commission_earnings" USING btree ("source_member_id");--> statement-breakpoint
CREATE INDEX "commission_earnings_type_idx" ON "commission_earnings" USING btree ("type");--> statement-breakpoint
CREATE INDEX "commission_targets_start_idx" ON "commission_targets" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "commission_tiers_target_idx" ON "commission_tiers" USING btree ("target_id");