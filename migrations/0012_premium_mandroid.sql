ALTER TABLE "expense_purchase_items" RENAME COLUMN "unit_price" TO "unit_cost";--> statement-breakpoint
ALTER TABLE "expense_purchase_items" DROP CONSTRAINT "unit_price_positive";--> statement-breakpoint
ALTER TABLE "expense_purchase_items" DROP CONSTRAINT "total_calculation";--> statement-breakpoint
ALTER TABLE "expense_purchase" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "expense_purchase_items" ADD CONSTRAINT "unit_price_positive" CHECK ("expense_purchase_items"."unit_cost" >= 0);--> statement-breakpoint
ALTER TABLE "expense_purchase_items" ADD CONSTRAINT "total_calculation" CHECK ("expense_purchase_items"."total" = "expense_purchase_items"."quantity" * "expense_purchase_items"."unit_cost");