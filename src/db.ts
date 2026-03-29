import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";

import * as tenantSchema from "./db/schema/tenants"
import * as userSchema from "./db/schema/users"
import * as invoicePrefixSchema from "./db/schema/invoiceCounters";
import * as categorySchema from "./db/schema/categories"
import * as productSchema from "./db/schema/products"
import * as unitSchema from "./db/schema/units"
import * as expenseOperationalSchema from "./db/schema/expense-operational"
import * as supplierSchema from "./db/schema/supplier"
import * as expensePurchaseSchema from "./db/schema/expense-purchase"
import * as expensePurchaseItemSchema from "./db/schema/expense-purchaseItem"

const schema = {
    ...tenantSchema,
    ...userSchema,
    ...invoicePrefixSchema,
    ...categorySchema,
    ...productSchema,
    ...unitSchema,
    ...expenseOperationalSchema,
    ...supplierSchema,
    ...expensePurchaseSchema,
    ...expensePurchaseItemSchema
}


// export const connectDB = (connectionString: string) => {
//     const sql = neon(connectionString)
//     return drizzle(sql, {schema})
// }

export const connectDB = (connectionString: string) => {
    const pool = new Pool({connectionString})
    return drizzle(pool, {schema})
}

export type DbClient = ReturnType<typeof connectDB>
