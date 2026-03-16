import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit"
dotenv.config({path: ".env.local"})

export default defineConfig({
    schema: "./src/schema.ts",
    out: "./migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!
    }
})