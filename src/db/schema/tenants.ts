import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { invoiceCounters } from "./invoiceCounters";

export const tenants = pgTable("tenants", {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull().unique(),
    email: text("email").notNull().unique(),
    phone: text("phone").notNull(),
    description: text("description"),
    invoicePrefix: text("invoice_prefix").notNull().unique(),
    createAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull()
})

export const tenatsRelation = relations(tenants, ({many}) => ({
    users: many(users),
    invoiceCounters: many(invoiceCounters)
}))

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;