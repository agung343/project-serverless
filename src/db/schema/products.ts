import {
  pgTable,
  text,
  timestamp,
  unique,
  numeric,
  integer,
  check,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { categories } from "./categories";
import { tenants } from "./tenants";
import { units } from "./units";

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    code: text("code").notNull(),
    price: integer("price").notNull().default(0),
    cost: integer("cost").notNull().default(0),
    stock: numeric("stock", { precision: 10, scale: 3 }).notNull().default("0"),
    sold: integer("sold").notNull().default(0),
    description: text("description"),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    unitId: integer("unit_id")
      .notNull()
      .references(() => units.id),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique().on(table.tenantId, table.code),
    unique().on(table.tenantId, table.slug),
    index("product_tenant_idx").on(table.tenantId),
    index("product_category_idx").on(table.categoryId),

    check("price_positive", sql`${table.price} >= 0`),
    check("cost_positive", sql`${table.cost} >= 0`),
    check("stock_positive", sql`${table.stock} >= 0`),

    foreignKey({
      columns: [table.categoryId, table.tenantId],
      foreignColumns: [categories.id, categories.tenantId],
    }),
  ]
);

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  unit: one(units, {
    fields: [products.unitId],
    references: [units.id], // Ensure proper reference to units.id
  }),
}));

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
