CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	CONSTRAINT "units_name_unique" UNIQUE("name"),
	CONSTRAINT "units_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;