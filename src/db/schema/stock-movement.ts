import { pgTable, pgEnum, text, timestamp, numeric, index, check} from "drizzle-orm/pg-core"
import { relations, sql} from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { products } from "./products"
import { tenants } from "./tenants"

export const movementTypeEnum = pgEnum("movement_type", [
    "PURCHASE",
    "SALE",
    "ADJUSTMENT",
    "RETURN"
])

export const stockMovement = pgTable("stock_movement", {
    id: text("id").primaryKey().$defaultFn(createId),
    productId: text("product_id").notNull().references(() => products.id, {onDelete: "restrict"}),
    tenantId: text("tenant_id").notNull().references(() => tenants.id, {onDelete: "cascade"}),
    type: movementTypeEnum("type").notNull(),
    quantity: numeric("quantity", {precision: 10, scale:3}).notNull(),
    referenceId: text("reference_id"),
    note: text("note"),
    checkedBy: text("checked_by"),
    createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
    index("stock_movement_tenant_idx").on(table.tenantId),
    index("stock_movement_product_idx").on(table.productId),
    index("stock_movement_reference_idx").on(table.referenceId),
    index("stock_movement_type").on(table.type),
    check("quantity_not_zero", sql`${table.quantity} >= 0`)
])

export const stockMovementRelations = relations(stockMovement, ({one}) => ({
    product: one(products, {
        fields: [stockMovement.productId],
        references: [products.id]
    }),
    tenant: one(tenants, {
        fields: [stockMovement.tenantId],
        references: [tenants.id]
    })
}))

export type StockMovement = typeof stockMovement.$inferSelect