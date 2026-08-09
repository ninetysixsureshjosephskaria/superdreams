CREATE TYPE "public"."activation_reward_type" AS ENUM('PERCENT', 'FIXED');--> statement-breakpoint
CREATE TABLE "activation_bonus_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"singleton" text DEFAULT 'SINGLETON' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"reward_type" "activation_reward_type" DEFAULT 'FIXED' NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"lock_days" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activation_bonus_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"member_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"reward_type" "activation_reward_type" NOT NULL,
	"value" integer NOT NULL,
	"lock_days" integer NOT NULL,
	"transaction_id" uuid,
	"qualified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activation_bonus_grants" ADD CONSTRAINT "activation_bonus_grants_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activation_bonus_grants" ADD CONSTRAINT "activation_bonus_grants_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activation_bonus_config_singleton_uq" ON "activation_bonus_config" USING btree ("singleton");--> statement-breakpoint
CREATE UNIQUE INDEX "activation_bonus_grants_member_uq" ON "activation_bonus_grants" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "activation_bonus_grants_wallet_idx" ON "activation_bonus_grants" USING btree ("wallet_id");