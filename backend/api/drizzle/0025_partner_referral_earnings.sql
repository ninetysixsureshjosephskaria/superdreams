CREATE TABLE "partner_referral_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"source_transaction_id" uuid NOT NULL,
	"earner_member_id" uuid NOT NULL,
	"partner_member_id" uuid NOT NULL,
	"partner_transaction_id" uuid NOT NULL,
	"rate_bps" integer NOT NULL,
	"source_points" integer NOT NULL,
	"partner_points" integer NOT NULL,
	"reversed_at" timestamp with time zone,
	"reversal_transaction_id" uuid
);
--> statement-breakpoint
ALTER TABLE "partner_referral_earnings" ADD CONSTRAINT "partner_referral_earnings_source_transaction_id_reward_transactions_id_fk" FOREIGN KEY ("source_transaction_id") REFERENCES "public"."reward_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_referral_earnings" ADD CONSTRAINT "partner_referral_earnings_earner_member_id_members_id_fk" FOREIGN KEY ("earner_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_referral_earnings" ADD CONSTRAINT "partner_referral_earnings_partner_member_id_members_id_fk" FOREIGN KEY ("partner_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_referral_earnings" ADD CONSTRAINT "partner_referral_earnings_partner_transaction_id_reward_transactions_id_fk" FOREIGN KEY ("partner_transaction_id") REFERENCES "public"."reward_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_referral_earnings" ADD CONSTRAINT "partner_referral_earnings_reversal_transaction_id_reward_transactions_id_fk" FOREIGN KEY ("reversal_transaction_id") REFERENCES "public"."reward_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "partner_referral_earnings_source_txn_uq" ON "partner_referral_earnings" USING btree ("source_transaction_id");--> statement-breakpoint
CREATE INDEX "partner_referral_earnings_partner_member_id_idx" ON "partner_referral_earnings" USING btree ("partner_member_id");--> statement-breakpoint
CREATE INDEX "partner_referral_earnings_earner_member_id_idx" ON "partner_referral_earnings" USING btree ("earner_member_id");