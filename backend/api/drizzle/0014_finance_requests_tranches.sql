CREATE TYPE "public"."deposit_tranche_status" AS ENUM('LOCKED', 'MATURED', 'UNLOCKED', 'LIQUIDATED');--> statement-breakpoint
CREATE TYPE "public"."financial_request_status" AS ENUM('PENDING', 'HOLD', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."financial_request_type" AS ENUM('DEPOSIT', 'WITHDRAW');--> statement-breakpoint
CREATE TABLE "deposit_tranches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"tranche_number" text NOT NULL,
	"member_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"deposit_request_id" uuid,
	"principal_cents" bigint NOT NULL,
	"bonus_bps" integer DEFAULT 0 NOT NULL,
	"bonus_cents" bigint DEFAULT 0 NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"lock_days" integer DEFAULT 30 NOT NULL,
	"matures_at" timestamp with time zone NOT NULL,
	"status" "deposit_tranche_status" DEFAULT 'LOCKED' NOT NULL,
	"unlocked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "financial_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"request_number" text NOT NULL,
	"member_id" uuid NOT NULL,
	"wallet_id" uuid,
	"type" "financial_request_type" NOT NULL,
	"status" "financial_request_status" DEFAULT 'PENDING' NOT NULL,
	"amount_cents" bigint NOT NULL,
	"units" integer NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"early" boolean DEFAULT false NOT NULL,
	"reason" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "deposit_tranches" ADD CONSTRAINT "deposit_tranches_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_tranches" ADD CONSTRAINT "deposit_tranches_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_tranches" ADD CONSTRAINT "deposit_tranches_deposit_request_id_financial_requests_id_fk" FOREIGN KEY ("deposit_request_id") REFERENCES "public"."financial_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_requests" ADD CONSTRAINT "financial_requests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_requests" ADD CONSTRAINT "financial_requests_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deposit_tranches_tranche_number_uq" ON "deposit_tranches" USING btree ("tranche_number");--> statement-breakpoint
CREATE INDEX "deposit_tranches_member_id_idx" ON "deposit_tranches" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "deposit_tranches_wallet_id_idx" ON "deposit_tranches" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "deposit_tranches_status_idx" ON "deposit_tranches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deposit_tranches_matures_at_idx" ON "deposit_tranches" USING btree ("matures_at");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_requests_request_number_uq" ON "financial_requests" USING btree ("request_number");--> statement-breakpoint
CREATE INDEX "financial_requests_member_id_idx" ON "financial_requests" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "financial_requests_status_idx" ON "financial_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "financial_requests_type_status_idx" ON "financial_requests" USING btree ("type","status");