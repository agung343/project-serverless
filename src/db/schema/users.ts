import { pgTable, text, timestamp, unique, index, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";

export const userRoleEnum = pgEnum("user_role", [
    "OWNER",
    "ADMIN",
    "STAFF"
])

export const users = pgTable("users", {
    id: text("id").primaryKey().$defaultFn(createId),
    username: text("username").notNull(),
    password: text("password").notNull(),
    
    role: userRoleEnum("role").default("ADMIN").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),

    tenantId: text("tenant_id").notNull().references(() => tenants.id)
}, (table) => [
    unique().on(table.tenantId, table.username),
    index("users_tenant_idx").on(table.id)
])

export const userRelation = relations(users, ({one}) => ({
    tenant: one(tenants, {
        fields: [users.tenantId],
        references: [tenants.id]
    })
}))

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;