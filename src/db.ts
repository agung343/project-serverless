// import { drizzle } from "drizzle-orm/neon-http"
// import { neon} from "@neondatabase/serverless"

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";

import * as tenantSchema from "./db/schema/tenants"
import * as userSchema from "./db/schema/users"
import * as invoicePrefixSchema from "./db/schema/invoiceCounters";
import * as categorySchema from "./db/schema/categories"
import * as productSchema from "./db/schema/products"
import * as unitSchema from "./db/schema/units"

const schema = {
    ...tenantSchema,
    ...userSchema,
    ...invoicePrefixSchema,
    ...categorySchema,
    ...productSchema,
    ...unitSchema
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
