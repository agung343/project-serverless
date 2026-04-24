CREATE TYPE "public"."expense_purchase_stock_status" AS ENUM('PENDING', 'PARTIAL', 'STOCKED');--> statement-breakpoint
ALTER TABLE "expense_purchase" ADD COLUMN "stock_status" "expense_purchase_stock_status" DEFAULT 'PARTIAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_purchase" ADD COLUMN "recorded_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_purchase_items" ADD COLUMN "product_id" text;--> statement-breakpoint
ALTER TABLE "expense_purchase_items" ADD CONSTRAINT "expense_purchase_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;