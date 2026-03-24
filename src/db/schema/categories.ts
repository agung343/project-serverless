import { pgTable, text, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { products } from "./products";
import { tenants } from "./tenants";

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique().on(table.id, table.tenantId),
    unique().on(table.tenantId, table.slug),
    index("category_tenant_idx").on(table.tenantId)
  ]
);

export const categoryRelations = relations(categories, ({ one, many }) => ({
  products: many(products),
  tenant: one(tenants, {
    fields: [categories.tenantId],
    references: [tenants.id],
  }),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
