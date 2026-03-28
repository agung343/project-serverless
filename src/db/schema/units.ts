import { pgTable, text, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm"
import { products } from "./products";

export const units = pgTable("units", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull().unique(),
    symbol: text("symbol").notNull().unique()
})

export const unitsRelations = relations(units, ({many}) => ({
    products: many(products)
}))