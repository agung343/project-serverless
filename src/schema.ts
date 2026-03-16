import { pgTable, text, timestamp, integer, unique, index, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
    "OWNER",
    "ADMIN",
    "STAFF"
])

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

export const users = pgTable("users", {
    id: text("id").primaryKey().$defaultFn(createId),
    username: text("username").notNull(),
    password: text("password").notNull(),
    
    role: userRoleEnum("role").default("ADMIN").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    uodatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),

    tenantId: text("tenant_id").notNull().references(() => tenants.id)
}, (table) => [
    unique().on(table.tenantId, table.username),
    index("tenant_index").on(table.id)
])

export const invoiceCounters = pgTable("invoice_counters", {
    id: text("id").primaryKey().$defaultFn(createId),
    year: integer("year").notNull(),
    lastNumber: integer("last_number").default(0).notNull(),
    tenantId: text("tenant_id").notNull().references(() => tenants.id)
}, (table) => [
    unique().on(table.tenantId, table.year)
])

// relations
export const tenatsRelation = relations(tenants, ({many}) => ({
    users: many(users),
    invoiceCounters: many(invoiceCounters)
}))

export const userRelation = relations(users, ({one}) => ({
    tenant: one(tenants, {
        fields: [users.tenantId],
        references: [tenants.id]
    })
}))

export const invoiceCountersRelation = relations(invoiceCounters, ({one}) => ({
    tenant: one(tenants, {
        fields: [invoiceCounters.tenantId],
        references: [tenants.id]
    })
}))