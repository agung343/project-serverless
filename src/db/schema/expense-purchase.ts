import {pgTable, pgEnum, text, numeric, timestamp, boolean, index, check, foreignKey} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm"
import { suppliers } from "./supplier";
import { tenants } from "./tenants";
import { createId } from "@paralleldrive/cuid2";
import { expensePurchaseItems } from "./expense-purchaseItem";

export const expensePurchaseStatusEnum = pgEnum("expense_purchase_status", [
    "DRAFT",
    "PARTIALLY_PAID",
    "PAID",
    "CANCELLED"
])

export const expensePurchase = pgTable("expense_purchase", {
    id: text("id").primaryKey().$defaultFn(createId),
    invoiceNumber: text("invoice_number").notNull(),
    totalAmount: numeric("total_amount", {precision: 12, scale:2}).notNull(),
    date: timestamp("date").defaultNow().notNull(),
    paid: numeric("paid", {precision: 12, scale: 2}).notNull().default("0"),
    status: expensePurchaseStatusEnum("status").default("DRAFT").notNull(),
    notes: text("notes"),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    supplierId: text("supplier_id").notNull().references(() => suppliers.id, {onDelete: "restrict"}),
    tenantId: text("tenant_id").notNull().references(() => tenants.id, {onDelete: "cascade"}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull()
}, (table) => [
    index("expense_purchase_tenant_idx").on(table.tenantId),
    index("expense_purchase_supplier_idx").on(table.supplierId),
    index("expense_purchase_status_idx").on(table.status),
    index("expense_purchase_date_idx").on(table.date),

    check("paid_not_exceed_total", sql`${table.paid} <= ${table.totalAmount}`),
    check("total_amount_positive", sql`${table.totalAmount} >= 0`),
    check("paid_positive", sql`${table.paid} >= 0`),

    foreignKey({
        columns: [table.supplierId, table.tenantId],
        foreignColumns: [suppliers.id, suppliers.tenantId]
    })
])  

export const expensePurchaseRelations = relations(expensePurchase, ({one,many}) => ({
    supplier: one(suppliers, {
        fields: [expensePurchase.supplierId],
        references: [suppliers.id]
    }),
    tenant: one(tenants, {
        fields: [expensePurchase.tenantId],
        references: [tenants.id]
    }),
    items: many(expensePurchaseItems)
}))

export type ExpensePurchase = typeof expensePurchase.$inferSelect;
export type NewExpensePurchase = typeof expensePurchase.$inferInsert;