import { config } from "dotenv"
import { drizzle } from "drizzle-orm/neon-serverless"
import { neon, Pool } from "@neondatabase/serverless"

import * as tenantSchema from "./db/schema/tenants"
import * as userSchema from "./db/schema/users"
import * as invoicePrefixSchema from "./db/schema/invoiceCounters";

config({path: ".env.local"})

const schema = {
    ...tenantSchema,
    ...userSchema,
    ...invoicePrefixSchema
}

const pool = new Pool({connectionString: process.env.DATABASE_URL!})
export const db = drizzle(pool, {schema})

