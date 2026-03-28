import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";

export const expenseOperational = pgTable("expense_operational", {
    id: text("id").primaryKey().$defaultFn(createId),
    name: text("name").notNull(),
    amount: integer("amount").notNull(),
    description: text("description"),
    tenantId: text("tenant_id").notNull().references(() => tenants.id, {onDelete: "cascade"}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull()
})

export const expenseOperationalRelations = relations(expenseOperational, ({one}) => ({
    tenant: one(tenants, {
        fields: [expenseOperational.tenantId],
        references: [tenants.id]
    })
}))

export type ExpenseOperational = typeof expenseOperational.$inferSelect;
export type NewExpenseOperational = typeof expenseOperational.$inferInsert;