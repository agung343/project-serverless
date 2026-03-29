ALTER TABLE "products" ALTER COLUMN "sold" SET DATA TYPE numeric(10, 3);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "sold" SET DEFAULT '0';