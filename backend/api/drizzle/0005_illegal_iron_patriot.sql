CREATE TYPE "public"."wallet_hold_status" AS ENUM('ACTIVE', 'RELEASED');--> statement-breakpoint
CREATE TYPE "public"."wallet_status" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_direction" AS ENUM('CREDIT', 'DEBIT');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_status" AS ENUM('POSTED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_type" AS ENUM('CREDIT', 'DEBIT', 'ADJUSTMENT', 'HOLD', 'RELEASE', 'REVERSAL');--> statement-breakpoint
CREATE TABLE "wallet_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"wallet_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"direction" "wallet_transaction_direction" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency_code" text NOT NULL,
	"reason" text NOT NULL,
	"approved_by" uuid
);
--> statement-breakpoint
CREATE TABLE "wallet_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"wallet_id" uuid NOT NULL,
	"currency_code" text NOT NULL,
	"available_minor" bigint DEFAULT 0 NOT NULL,
	"held_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"wallet_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency_code" text NOT NULL,
	"status" "wallet_hold_status" DEFAULT 'ACTIVE' NOT NULL,
	"reason" text,
	"placed_by" uuid,
	"place_transaction_id" uuid,
	"released_by" uuid,
	"released_at" timestamp with time zone,
	"release_transaction_id" uuid
);
--> statement-breakpoint
CREATE TABLE "wallet_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"wallet_id" uuid NOT NULL,
	"currency_code" text NOT NULL,
	"min_balance_minor" bigint DEFAULT 0 NOT NULL,
	"max_balance_minor" bigint,
	"daily_debit_limit_minor" bigint,
	"single_transaction_limit_minor" bigint,
	"allow_negative" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"wallet_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"currency_code" text NOT NULL,
	"opening_balance_minor" bigint NOT NULL,
	"closing_balance_minor" bigint NOT NULL,
	"total_credits_minor" bigint NOT NULL,
	"total_debits_minor" bigint NOT NULL,
	"transaction_count" integer NOT NULL,
	"generated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "wallet_transaction_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"code" "wallet_transaction_type" NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"normal_direction" "wallet_transaction_direction" NOT NULL,
	"affects_held" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"type" "wallet_transaction_type" NOT NULL,
	"direction" "wallet_transaction_direction" NOT NULL,
	"status" "wallet_transaction_status" DEFAULT 'POSTED' NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency_code" text NOT NULL,
	"available_after_minor" bigint NOT NULL,
	"held_after_minor" bigint NOT NULL,
	"description" text,
	"hold_id" uuid,
	"reversal_of_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"wallet_number" text NOT NULL,
	"member_id" uuid NOT NULL,
	"currency_code" text NOT NULL,
	"status" "wallet_status" DEFAULT 'PENDING' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_adjustments" ADD CONSTRAINT "wallet_adjustments_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_balances" ADD CONSTRAINT "wallet_balances_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_holds" ADD CONSTRAINT "wallet_holds_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_limits" ADD CONSTRAINT "wallet_limits_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_statements" ADD CONSTRAINT "wallet_statements_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wallet_adjustments_wallet_id_idx" ON "wallet_adjustments" USING btree ("wallet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_balances_wallet_id_uq" ON "wallet_balances" USING btree ("wallet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_holds_reference_uq" ON "wallet_holds" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "wallet_holds_wallet_id_idx" ON "wallet_holds" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "wallet_holds_status_idx" ON "wallet_holds" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_limits_wallet_id_uq" ON "wallet_limits" USING btree ("wallet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_statements_reference_uq" ON "wallet_statements" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "wallet_statements_wallet_id_idx" ON "wallet_statements" USING btree ("wallet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_transaction_types_code_uq" ON "wallet_transaction_types" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_transactions_reference_uq" ON "wallet_transactions" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "wallet_transactions_wallet_id_idx" ON "wallet_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "wallet_transactions_wallet_created_idx" ON "wallet_transactions" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE INDEX "wallet_transactions_type_idx" ON "wallet_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "wallet_transactions_status_idx" ON "wallet_transactions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_wallet_number_uq" ON "wallets" USING btree ("wallet_number");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_member_id_uq" ON "wallets" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "wallets_status_idx" ON "wallets" USING btree ("status");--> statement-breakpoint
INSERT INTO "wallet_transaction_types" ("code", "label", "description", "normal_direction", "affects_held") VALUES
	('CREDIT', 'Credit', 'Funds added to the available balance.', 'CREDIT', false),
	('DEBIT', 'Debit', 'Funds removed from the available balance.', 'DEBIT', false),
	('ADJUSTMENT', 'Adjustment', 'Manual administrative balance correction.', 'CREDIT', false),
	('HOLD', 'Hold', 'Funds moved from available to held.', 'DEBIT', true),
	('RELEASE', 'Release', 'Held funds returned to available.', 'CREDIT', true),
	('REVERSAL', 'Reversal', 'Compensating entry neutralising a prior transaction.', 'CREDIT', false);
