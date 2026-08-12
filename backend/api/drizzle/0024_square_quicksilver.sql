CREATE TYPE "public"."redemption_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "redemption_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"member_id" uuid NOT NULL,
	"points_requested" integer NOT NULL,
	"status" "redemption_request_status" DEFAULT 'PENDING' NOT NULL,
	"note" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decision_reason" text
);
--> statement-breakpoint
ALTER TABLE "redemption_requests" ADD CONSTRAINT "redemption_requests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "redemption_requests_member_id_idx" ON "redemption_requests" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "redemption_requests_status_idx" ON "redemption_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "redemption_requests_one_pending_uq" ON "redemption_requests" USING btree ("member_id") WHERE "redemption_requests"."status" = 'PENDING';