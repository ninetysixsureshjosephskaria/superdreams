CREATE TABLE "financial_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"singleton" boolean DEFAULT true NOT NULL,
	"min_deposit_units" integer DEFAULT 1 NOT NULL,
	"max_deposit_units" integer DEFAULT 10000 NOT NULL,
	"min_withdraw_cents" bigint DEFAULT 3000 NOT NULL,
	"early_withdraw_allowed" boolean DEFAULT true NOT NULL,
	"early_withdraw_fee_bps" integer DEFAULT 1000 NOT NULL,
	"processing_min_days" integer DEFAULT 3 NOT NULL,
	"processing_max_days" integer DEFAULT 4 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "currencies" ADD COLUMN "per_unit_value" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "currencies" ADD COLUMN "is_base" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "currencies" ADD COLUMN "flag_slug" text;--> statement-breakpoint
CREATE UNIQUE INDEX "financial_limits_singleton_uq" ON "financial_limits" USING btree ("singleton");