CREATE TYPE "public"."expense_purchase_status" AS ENUM('DRAFT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "expense_purchase" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "expense_purchase_status" DEFAULT 'DRAFT' NOT NULL,
	"notes" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"supplier_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "paid_not_exceed_total" CHECK ("expense_purchase"."paid" <= "expense_purchase"."total_amount"),
	CONSTRAINT "total_amount_positive" CHECK ("expense_purchase"."total_amount" >= 0),
	CONSTRAINT "paid_positive" CHECK ("expense_purchase"."paid" >= 0)
);
--> statement-breakpoint
CREATE TABLE "expense_purchase_items" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_id" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quantity_positive" CHECK ("expense_purchase_items"."quantity" > 0),
	CONSTRAINT "unit_price_positive" CHECK ("expense_purchase_items"."unit_price" >= 0),
	CONSTRAINT "total_calculation" CHECK ("expense_purchase_items"."total" = "expense_purchase_items"."quantity" * "expense_purchase_items"."unit_price")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact" text,
	"address" text,
	"notes" text,
	"tenant_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense_purchase" ADD CONSTRAINT "expense_purchase_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_purchase" ADD CONSTRAINT "expense_purchase_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_purchase_items" ADD CONSTRAINT "expense_purchase_items_purchase_id_expense_purchase_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."expense_purchase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_purchase_items" ADD CONSTRAINT "expense_purchase_items_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_purchase_tenant_idx" ON "expense_purchase" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "expense_purchase_supplier_idx" ON "expense_purchase" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "expense_purchase_status_idx" ON "expense_purchase" USING btree ("status");--> statement-breakpoint
CREATE INDEX "expense_purchase_date_idx" ON "expense_purchase" USING btree ("date");--> statement-breakpoint
CREATE INDEX "expense_purchase_items_purchase_idx" ON "expense_purchase_items" USING btree ("purchase_id");