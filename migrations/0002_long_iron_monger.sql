ALTER TABLE "products" ALTER COLUMN "price" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "stock" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cost" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_code_unique" UNIQUE("tenant_id","code");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "price_positive" CHECK ("products"."price" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "cost_positive" CHECK ("products"."cost" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "stock_positive" CHECK ("products"."stock" >= 0);