import { pgTable, text, numeric, timestamp, index, check, foreignKey } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { orders } from "./orders";
import { products } from "./products";

export const orderItems = pgTable("order_items", {
    id: text("id").primaryKey().$defaultFn(createId),
    productId: text("product_id").notNull().references(() => products.id, {onDelete: "restrict"}),
    quantity: numeric("quantity", {precision: 10, scale: 3}).notNull(),
    unitPrice: numeric("unit_price", {precision: 12, scale:2}).notNull(),
    total: numeric("total", {precision: 10, scale:2}).notNull(),
    orderId: text("order_id").notNull().references(() => orders.id, {onDelete: "restrict"}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()) 
}, (table) => [
    index("order_item_on_orderId_idx").on(table.orderId),
    check("quantity_positivie", sql`${table.quantity} > 0`),
    check("unit_price_positive", sql`${table.unitPrice} >= 0`),
    check("total_calculation", sql`${table.total} = ${table.quantity} * ${table.unitPrice}`),
])

export const orderItemsRelations = relations(orderItems, ({one}) => ({
    product: one(products, {
        fields: [orderItems.productId],
        references: [products.id]
    }),
    order: one(orders, {
        fields: [orderItems.orderId],
        references: [orders.id]
    })
}))