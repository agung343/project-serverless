import { createApp } from "../lib/createApp";
import { z } from "zod"
import { verifyToken } from "../middlewares/verifyToken";
import { zValidator } from "@hono/zod-validator";
import { SalesService } from "../services/sales.service";
import { connectDB } from "../db";
import { OrderQuerySchema, EditOrderSchema, DeleteOrderSchema } from "../validators/order.schema";
import { HttpError } from "../middlewares/HttpError";
import { verifyRole } from "../middlewares/verifyRole";

const sales = createApp()

sales.get(
    "/",
    verifyToken,
    zValidator("query", OrderQuerySchema),
    async (c) => {
        const { tenantId } = c.get("user")
        const db = connectDB(c.env.DATABASE_URL)
        const query = c.req.valid("query")
        const result = await SalesService.getAllSales(db, tenantId, query)
        return c.json(result, 200)
    }
)

sales.get(
    "/archieve",
    verifyToken,
    zValidator("query", OrderQuerySchema),
    async (c) => {
        const {tenantId} = c.get("user")
        const db = connectDB(c.env.DATABASE_URL)
        const query = c.req.valid("query")
        const result = await SalesService.getSalesArchieve(db, tenantId, query)
        return c.json(result, 200)
    }
)

sales.patch(
    "/:saleId",
    verifyToken,
    verifyRole("OWNER", "ADMIN"),
    zValidator("json", EditOrderSchema, (parsed) => {
        if (!parsed.success) {
            const flatten = z.flattenError(parsed.error)
            throw new HttpError(422, "Validation error", flatten.fieldErrors)
        }
    }),
    async (c) => {
        const { tenantId } = c.get("user")
        const saleId = c.req.param("saleId")
        const db = connectDB(c.env.DATABASE_URL)
        const payload = c.req.valid("json")
        const result = await SalesService.editSale(db, {id: saleId, tenantId}, payload)
        return c.json(result, 200)
    }
)

sales.patch(
    "/:saleId/delete",
    verifyToken,
    verifyRole("OWNER", "ADMIN"),
    zValidator("json", DeleteOrderSchema, (parsed) => {
        if (!parsed.success) {
            const flatten = z.flattenError(parsed.error)
            throw new HttpError(422, "Validation error", flatten.fieldErrors)
        }
    }),
    async (c) => {
        const { tenantId } = c.get("user")
        const saleId = c.req.param("saleId")
        const db = connectDB(c.env.DATABASE_URL)
        const payload = c.req.valid("json")
        const result = await SalesService.archieveDeleteSale(db, {id: saleId, tenantId}, saleId)
        return c.json(result, 200)
    }
)

export default sales
