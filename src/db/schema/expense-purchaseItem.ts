import {
  pgTable,
  text,
  numeric,
  timestamp,
  index,
  check,
  integer,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { expensePurchase } from "./expense-purchase";
import { products } from "./products";
import { units } from "./units";

export const expensePurchaseItems = pgTable(
  "expense_purchase_items",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    productId: text("product_id").references(() => products.id, {
      onDelete: "restrict",
    }),
    purchaseId: text("purchase_id")
      .notNull()
      .references(() => expensePurchase.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "restrict" }),
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("expense_purchase_items_purchase_idx").on(table.purchaseId),
    check("quantity_positive", sql`${table.quantity} > 0`),
    check("unit_price_positive", sql`${table.unitCost} >= 0`),
    check(
      "total_calculation",
      sql`${table.total} = ${table.quantity} * ${table.unitCost}`
    ),
  ]
);

export const expensePurchaseItemsRelations = relations(
  expensePurchaseItems,
  ({ one }) => ({
    purchase: one(expensePurchase, {
      fields: [expensePurchaseItems.purchaseId],
      references: [expensePurchase.id],
    }),
    unit: one(units, {
      fields: [expensePurchaseItems.unitId],
      references: [units.id],
    }),
    product: one(products, {
      fields: [expensePurchaseItems.productId],
      references: [products.id],
    }),
  })
);

export type ExpensePurchaseItem = typeof expensePurchaseItems.$inferSelect;
export type NewExpensePurchaseItem = typeof expensePurchaseItems.$inferInsert;
