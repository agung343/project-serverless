import { createApp } from "../lib/createApp";
import { zValidator } from "@hono/zod-validator";
import { verifyToken } from "../middlewares/verifyToken";
import { ReportService } from "../services/report.service";
import { DashboardQuerySchema, TransactionQuerySchema } from "../validators/report.schema";
import { connectDB } from "../db";

const report = createApp()

report.get(
    "/dashboard",
    verifyToken,
    zValidator("query", DashboardQuerySchema),
    async (c) => {
        const { tenantId } = c.get("user")
        const db = connectDB(c.env.DATABASE_URL)
        const query = c.req.valid("query")
        const result = await ReportService.dashboard(db, tenantId, query)
        return c.json(result, 200)
    }
)

report.get(
    "/sales",
    verifyToken,
    zValidator("query", TransactionQuerySchema),
    async (c) => {
        const { tenantId} = c.get("user")
        const db = connectDB(c.env.DATABASE_URL)
        const query = c.req.valid("query")
        const result = await ReportService.salesReport(db, tenantId, query)
        return c.json(result, 200)
    }
)

report.get(
    "/purchases",
    verifyToken,
    zValidator("query", TransactionQuerySchema),
    async (c) => {
        const { tenantId } = c.get("user")
        const db = connectDB(c.env.DATABASE_URL)
        const query = c.req.valid("query")
        const result = await ReportService.purchasesReport(db, tenantId, query)
        return c.json(result, 200)
    }
)

export default report;
