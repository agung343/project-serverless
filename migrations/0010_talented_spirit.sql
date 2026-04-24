CREATE TYPE "public"."payment_type_enum" AS ENUM('cash', 'qris', 'card', 'e-money');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_type" "payment_type_enum" NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "card_last_four" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "card_reference" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "e_money_platform" text;