// change to drizzle-orm/neon-serverless and @neondatabase/serverless

import { drizzle  } from "drizzle-orm/node-postgres"
import { Pool} from "pg"

import * as tenantSchema from "./db/schema/tenants"
import * as userSchema from "./db/schema/users"
import * as invoicePrefixSchema from "./db/schema/invoiceCounters";
import * as categorySchema from "./db/schema/categories"
import * as productSchema from "./db/schema/products"
import * as unitSchema from "./db/schema/units"
import * as supplierSchema from "./db/schema/supplier"
import * as expenseOperationalSchema from "./db/schema/expense-operational"
import * as expensePurchaseSchema from "./db/schema/expense-purchase"
import * as expensePurchaseItemSchema from "./db/schema/expense-purchaseItem"
import * as stockMovement from "./db/schema/stock-movement"

const schema = {
    ...tenantSchema,
    ...userSchema,
    ...invoicePrefixSchema,
    ...categorySchema,
    ...productSchema,
    ...unitSchema,
    ...supplierSchema,
    ...expenseOperationalSchema,
    ...expensePurchaseSchema,
    ...expensePurchaseItemSchema,
    ...stockMovement
}

export const connectDB = (connectionString: string) => {
    const pool = new Pool({connectionString})
    return drizzle(pool, {schema})
}

export type DbClient = ReturnType<typeof connectDB>
