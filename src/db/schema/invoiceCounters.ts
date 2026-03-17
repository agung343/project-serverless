import { pgTable, text, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";

export const invoiceCounters = pgTable("invoice_counters", {
    id: text("id").primaryKey().$defaultFn(createId),
    year: integer("year").notNull(),
    lastNumber: integer("last_number").default(0).notNull(),
    tenantId: text("tenant_id").notNull().references(() => tenants.id)
}, (table) => [
    unique().on(table.tenantId, table.year)
])

export const invoiceCountersRelation = relations(invoiceCounters, ({one}) => ({
    tenant: one(tenants, {
        fields: [invoiceCounters.tenantId],
        references: [tenants.id]
    })
}))