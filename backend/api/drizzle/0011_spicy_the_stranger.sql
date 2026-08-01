CREATE TYPE "public"."game_session_status" AS ENUM('STARTED', 'COMPLETED', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "public"."game_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."store_inventory_change_type" AS ENUM('RESTOCK', 'REDEMPTION', 'CANCELLATION', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."store_order_status" AS ENUM('PENDING', 'FULFILLED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."store_product_status" AS ENUM('ACTIVE', 'DRAFT', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "store_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_inventory_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"change_type" "store_inventory_change_type" NOT NULL,
	"change" integer NOT NULL,
	"stock_after" integer NOT NULL,
	"reason" text,
	"order_id" uuid,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"points" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"reference" text NOT NULL,
	"member_id" uuid NOT NULL,
	"status" "store_order_status" DEFAULT 'PENDING' NOT NULL,
	"total_points" integer NOT NULL,
	"reward_transaction_id" uuid,
	"refund_transaction_id" uuid,
	"placed_by" uuid,
	"fulfilled_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "store_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"category_id" uuid,
	"points" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 0 NOT NULL,
	"status" "store_product_status" DEFAULT 'DRAFT' NOT NULL,
	"description" text,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "game_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"points" integer NOT NULL,
	"reward_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"game_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"status" "game_session_status" DEFAULT 'STARTED' NOT NULL,
	"entry_transaction_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"entry_cost" integer DEFAULT 0 NOT NULL,
	"min_reward" integer DEFAULT 0 NOT NULL,
	"max_reward" integer DEFAULT 0 NOT NULL,
	"max_score" integer DEFAULT 100 NOT NULL,
	"status" "game_status" DEFAULT 'ACTIVE' NOT NULL,
	"config" jsonb
);
--> statement-breakpoint
ALTER TABLE "store_inventory_history" ADD CONSTRAINT "store_inventory_history_product_id_store_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."store_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_order_id_store_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."store_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_product_id_store_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."store_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_placed_by_users_id_fk" FOREIGN KEY ("placed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_category_id_store_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."store_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_rewards" ADD CONSTRAINT "game_rewards_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_rewards" ADD CONSTRAINT "game_rewards_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_rewards" ADD CONSTRAINT "game_rewards_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_categories_slug_uq" ON "store_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "store_inventory_history_product_id_idx" ON "store_inventory_history" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "store_inventory_history_created_at_idx" ON "store_inventory_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "store_order_items_order_id_idx" ON "store_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_orders_reference_uq" ON "store_orders" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "store_orders_member_id_idx" ON "store_orders" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "store_orders_status_idx" ON "store_orders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "store_products_sku_uq" ON "store_products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "store_products_category_idx" ON "store_products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "store_products_status_idx" ON "store_products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "game_rewards_session_id_idx" ON "game_rewards" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "game_rewards_member_id_idx" ON "game_rewards" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "game_scores_session_id_idx" ON "game_scores" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "game_scores_member_id_idx" ON "game_scores" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "game_sessions_member_id_idx" ON "game_sessions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "game_sessions_game_id_idx" ON "game_sessions" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_sessions_status_idx" ON "game_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "games_code_uq" ON "games" USING btree ("code");--> statement-breakpoint
CREATE INDEX "games_status_idx" ON "games" USING btree ("status");--> statement-breakpoint
INSERT INTO "store_categories" ("name", "slug", "description", "is_active", "sort_order") VALUES
	('Electronics', 'electronics', 'Gadgets and devices.', true, 10),
	('Travel', 'travel', 'Trips, passes and stays.', true, 20),
	('Gift Cards', 'gift-cards', 'Retail and digital gift cards.', true, 30),
	('Experiences', 'experiences', 'Classes, events and days out.', true, 40),
	('Home & Living', 'home-living', 'Homeware and lifestyle.', true, 50),
	('Fashion', 'fashion', 'Apparel and accessories.', false, 60);--> statement-breakpoint
INSERT INTO "store_products" ("name", "sku", "category_id", "points", "stock", "reorder_level", "status", "description")
SELECT p.name, p.sku, c.id, p.points, p.stock, p.reorder_level, p.status::"public"."store_product_status", p.description
FROM (VALUES
	('Wireless Headphones', 'SD-ELEC-001', 'electronics', 12000, 24, 10, 'ACTIVE', 'Over-ear noise-cancelling headphones with 30-hour battery life.'),
	('Smart Watch', 'SD-ELEC-002', 'electronics', 25000, 8, 10, 'ACTIVE', 'Fitness tracking and notifications, water-resistant.'),
	('Weekend Getaway', 'SD-TRVL-001', 'travel', 80000, 3, 5, 'ACTIVE', 'Two nights for two at a partner boutique hotel.'),
	('Airport Lounge Pass', 'SD-TRVL-002', 'travel', 15000, 0, 8, 'ACTIVE', 'Single-visit lounge access at 1,000+ airports.'),
	('$50 Gift Card', 'SD-GIFT-050', 'gift-cards', 5000, 120, 25, 'ACTIVE', 'Redeemable at a wide range of partner retailers.'),
	('$100 Gift Card', 'SD-GIFT-100', 'gift-cards', 10000, 60, 25, 'ACTIVE', 'Double the value, same easy redemption.'),
	('Cooking Class', 'SD-EXPR-001', 'experiences', 18000, 5, 6, 'ACTIVE', 'Hands-on evening class with a professional chef.'),
	('Spa Day', 'SD-EXPR-002', 'experiences', 22000, 12, 6, 'DRAFT', 'Full-day relaxation package with massage and facial.'),
	('Scented Candle Set', 'SD-HOME-001', 'home-living', 4500, 40, 15, 'ACTIVE', 'Set of three hand-poured soy candles.'),
	('Designer Sunglasses', 'SD-FASH-001', 'fashion', 16000, 2, 8, 'ARCHIVED', 'Polarised lenses with a timeless frame.')
) AS p(name, sku, category_slug, points, stock, reorder_level, status, description)
JOIN "store_categories" c ON c.slug = p.category_slug;--> statement-breakpoint
INSERT INTO "games" ("code", "name", "description", "entry_cost", "min_reward", "max_reward", "max_score", "status") VALUES
	('SPIN_AND_WIN', 'Spin & Win', 'Spin the wheel and land on instant points prizes.', 50, 100, 5000, 100, 'ACTIVE'),
	('SCRATCH_CARD', 'Scratch Card', 'Scratch to reveal a hidden reward on every card.', 20, 50, 2000, 100, 'ACTIVE'),
	('LUCKY_DRAW', 'Lucky Draw', 'Enter the weekly draw for the grand prize.', 100, 0, 50000, 100, 'ACTIVE');