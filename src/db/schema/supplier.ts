import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { expensePurchase } from "./expense-purchase";

export const suppliers = pgTable("suppliers", {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    phone: text("contact"),
    address: text("address"),
    notes: text("notes"),
    tenantId: text("tenant_id").notNull().references(() => tenants.id, {onDelete: "cascade"}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull()
})

export const suppliersRelations = relations(suppliers, ({one, many}) => ({
    tenant: one(tenants, {
        fields: [suppliers.tenantId],
        references: [tenants.id]
    }),
    purchases: many(expensePurchase)
}))

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;