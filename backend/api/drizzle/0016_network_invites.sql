CREATE TYPE "public"."invite_role" AS ENUM('PARTNER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('PENDING', 'USED', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"code" text NOT NULL,
	"role" "invite_role" NOT NULL,
	"status" "invite_status" DEFAULT 'PENDING' NOT NULL,
	"assigned_admin_id" uuid,
	"assigned_partner_id" uuid,
	"invited_by_user_id" uuid,
	"expires_at" timestamp with time zone,
	"used_by_user_id" uuid,
	"used_by_member_id" uuid,
	"used_at" timestamp with time zone,
	"revoked_by" uuid,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "referred_by" uuid;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "partner_id" uuid;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_assigned_admin_id_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_assigned_partner_id_members_id_fk" FOREIGN KEY ("assigned_partner_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_used_by_user_id_users_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_used_by_member_id_members_id_fk" FOREIGN KEY ("used_by_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invites_code_uq" ON "invites" USING btree ("code");--> statement-breakpoint
CREATE INDEX "invites_status_idx" ON "invites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invites_role_idx" ON "invites" USING btree ("role");--> statement-breakpoint
CREATE INDEX "invites_assigned_partner_id_idx" ON "invites" USING btree ("assigned_partner_id");--> statement-breakpoint
CREATE INDEX "invites_assigned_admin_id_idx" ON "invites" USING btree ("assigned_admin_id");--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_referred_by_members_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_partner_id_members_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "members_referred_by_idx" ON "members" USING btree ("referred_by");--> statement-breakpoint
CREATE INDEX "members_partner_id_idx" ON "members" USING btree ("partner_id");