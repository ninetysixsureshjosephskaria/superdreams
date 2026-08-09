CREATE TYPE "public"."bonus_campaign_scope" AS ENUM('FIRST_DEPOSIT', 'ALL_DEPOSITS');--> statement-breakpoint
CREATE TYPE "public"."bonus_claim_frequency" AS ENUM('SINGLE', 'MULTI');--> statement-breakpoint
CREATE TABLE "bonus_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"scope" "bonus_campaign_scope" NOT NULL,
	"frequency" "bonus_claim_frequency" NOT NULL,
	"rate_bps" integer NOT NULL,
	"lock_days" integer DEFAULT 30 NOT NULL,
	"min_units" integer DEFAULT 0 NOT NULL,
	"permanent" boolean DEFAULT false NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bonus_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"dedupe_key" text NOT NULL,
	"campaign_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"deposit_request_id" uuid NOT NULL,
	"tranche_id" uuid NOT NULL,
	"bonus_cents" bigint NOT NULL,
	"rate_bps" integer NOT NULL,
	"lock_days" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bonus_claims" ADD CONSTRAINT "bonus_claims_campaign_id_bonus_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."bonus_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_claims" ADD CONSTRAINT "bonus_claims_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_claims" ADD CONSTRAINT "bonus_claims_deposit_request_id_financial_requests_id_fk" FOREIGN KEY ("deposit_request_id") REFERENCES "public"."financial_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bonus_campaigns_enabled_idx" ON "bonus_campaigns" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "bonus_campaigns_start_idx" ON "bonus_campaigns" USING btree ("start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bonus_claims_dedupe_key_uq" ON "bonus_claims" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "bonus_claims_campaign_member_idx" ON "bonus_claims" USING btree ("campaign_id","member_id");--> statement-breakpoint
CREATE INDEX "bonus_claims_member_idx" ON "bonus_claims" USING btree ("member_id");