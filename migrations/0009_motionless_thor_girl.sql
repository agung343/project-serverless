CREATE TYPE "public"."order_status_enum" AS ENUM('ORDERED', 'PARTIALLY_PAID', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN');--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"order_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "quantity_positivie" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "unit_price_positive" CHECK ("order_items"."unit_price" >= 0),
	CONSTRAINT "total_calculation" CHECK ("order_items"."total" = "order_items"."quantity" * "order_items"."unit_price")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"total_amount" numeric(12, 3) NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"paid" numeric(12, 3) DEFAULT '0' NOT NULL,
	"status" "order_status_enum" DEFAULT 'ORDERED' NOT NULL,
	"notes" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "orders_invoice_number_unique" UNIQUE("invoice_number"),
	CONSTRAINT "paid_not exceed_total" CHECK ("orders"."paid" <= "orders"."total_amount"),
	CONSTRAINT "total_amount_positive" CHECK ("orders"."total_amount" >= 0),
	CONSTRAINT "paid_positive" CHECK ("orders"."paid" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movement" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"type" "movement_type" NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"reference_id" text,
	"note" text,
	"checked_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quantity_not_zero" CHECK ("stock_movement"."quantity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_item_on_orderId_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_tenant_idx" ON "orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "order_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_date_idx" ON "orders" USING btree ("date");--> statement-breakpoint
CREATE INDEX "stock_movement_tenant_idx" ON "stock_movement" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "stock_movement_product_idx" ON "stock_movement" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_movement_reference_idx" ON "stock_movement" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "stock_movement_type" ON "stock_movement" USING btree ("type");