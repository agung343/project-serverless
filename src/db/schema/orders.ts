import { pgTable, text, timestamp, pgEnum, numeric, boolean, index, check } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { orderItems } from "./orderItems";

export const orderStatusEnum = pgEnum("order_status_enum", [
    "ORDERED",
    "PARTIALLY_PAID",
    "PAID"
])

export const paymentEnum = pgEnum("payment_type_enum", [
    "cash", "qris", "card", "e-money"
])

export const orders = pgTable("orders", {
    id:text("id").primaryKey().$defaultFn(createId),
    invoiceNumber: text("invoice_number").unique().notNull(),
    totalAmount: numeric("total_amount", {precision: 12, scale: 3}).notNull(),
    date: timestamp("date").defaultNow().notNull(),
    paid: numeric("paid", {precision:12, scale:3}).notNull().default("0"),
    status: orderStatusEnum("status").default("ORDERED").notNull(),
    notes: text("notes"),
    paymentType: paymentEnum("payment_type").notNull(),
    cardLastFour: text("card_last_four"),
    cardReference: text("card_reference"),
    emoneyPlatform: text("e_money_platform"),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    tenantId: text("tenant_id").notNull().references(() => tenants.id, {onDelete: "cascade"}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date())
}, (table) => [
    index("order_tenant_idx").on(table.tenantId),
    index("order_status_idx").on(table.status),
    index("order_date_idx").on(table.date),

    check("paid_not exceed_total", sql`${table.paid} <= ${table.totalAmount}`),
    check("total_amount_positive", sql`${table.totalAmount} >= 0`),
    check("paid_positive", sql`${table.paid} >= 0`)
])

export const orderRelations = relations(orders, ({one, many}) => ({
    tenant: one(tenants, {
        fields: [orders.tenantId],
        references: [tenants.id]
    }),
    items: many(orderItems)
}))

export type Order = typeof orders.$inferSelect