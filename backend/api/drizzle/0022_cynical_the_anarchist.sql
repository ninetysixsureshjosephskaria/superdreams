ALTER TABLE "members" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "pending_referrer_id" uuid;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_pending_referrer_id_members_id_fk" FOREIGN KEY ("pending_referrer_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "members_referral_code_uq" ON "members" USING btree ("referral_code");