import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit"
dotenv.config({path: ".env.local"})

export default defineConfig({
    schema: "./src/db/schema",
    out: "./migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!
    }
})