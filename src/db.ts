// import { drizzle } from "drizzle-orm/neon-http"
// import { neon} from "@neondatabase/serverless"

import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres"
import { Pool } from "@neondatabase/serverless";
import { Pool as PoolPg} from "pg"

import * as tenantSchema from "./db/schema/tenants"
import * as userSchema from "./db/schema/users"
import * as invoicePrefixSchema from "./db/schema/invoiceCounters";
import * as categorySchema from "./db/schema/categories"
import * as productSchema from "./db/schema/products"
import * as unitSchema from "./db/schema/units"
import * as expenseOperationalSchema from "./db/schema/expense-operational"

const schema = {
    ...tenantSchema,
    ...userSchema,
    ...invoicePrefixSchema,
    ...categorySchema,
    ...productSchema,
    ...unitSchema,
    ...expenseOperationalSchema
}

const isProd = process.env.NODE_ENV === "production"

export const connectDB = (connectionString: string) => {
    if (isProd) {
        const pool = new Pool({connectionString}) 
        return drizzleNeon(pool, {schema})
    } else {
        const pool = new PoolPg({connectionString}) 
        return drizzlePg(pool, {schema})
    }
}

// export const connectDB = (connectionString: string) => {
//     const pool = new Pool({connectionString})
//     return drizzle(pool, {schema})
// }

export type DbClient = ReturnType<typeof connectDB>
