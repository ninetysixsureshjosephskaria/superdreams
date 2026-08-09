CREATE TYPE "public"."wallet_kind" AS ENUM('LOYALTY', 'FINANCIAL');--> statement-breakpoint
DROP INDEX "wallets_member_id_uq";--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "kind" "wallet_kind" DEFAULT 'LOYALTY' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_member_id_kind_uq" ON "wallets" USING btree ("member_id","kind");