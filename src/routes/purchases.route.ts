import { createApp } from "../lib/createApp";
import { z } from "zod"
import { zValidator } from "@hono/zod-validator";
import { connectDB } from "../db";
import { verifyToken } from "../middlewares/verifyToken";
import { verifyRole } from "../middlewares/verifyRole";
import { PurchasesService } from "../services/purchases.service";
import { CreateExpensePurchaseSchema, ArchievePurchaseSchema } from "../validators/expense.schema";
import { CreatePurchaseQuerySchema, PurchaseQuerySchema} from "../validators/purchase.schema"
import { HttpError } from "../middlewares/HttpError";

const purchase = createApp()

purchase.get(
    "/",
    verifyToken,
    zValidator("query", PurchaseQuerySchema),
    async (c) => {
        const { tenantId } = c.get("user")
        const db = connectDB(c.env.DATABASE_URL)
        const query = c.req.valid("query")
        const result = await PurchasesService.getPurchaseExpenses(db, tenantId, query)
        return c.json(result, 200)
    }
)

purchase.post(
    "/",
    verifyToken,
    zValidator("json", CreateExpensePurchaseSchema, (parsed) => {
        if (!parsed.success) {
            const flatten = z.flattenError(parsed.error)
            throw new HttpError(422, "Validation error", flatten.fieldErrors)
        }
    }),
    async (c) => {
        const { tenantId, username } = c.get("user")
        const db = connectDB(c.env.DATABASE_URL)
        const payload = c.req.valid("json")
        const result = await PurchasesService.createNewPurchaseExpense(db, tenantId, username, payload)
        return c.json(result, 201)
    }
)

purchase.get(
    "/find",
    verifyToken,
    zValidator("query", CreatePurchaseQuerySchema),
    async (c) => {
        const { tenantId } = c.get("user")
        const db = connectDB(c.env.DATABASE_URL)
        const query = c.req.valid("query")
        const result = await PurchasesService.getProductsAndSupplier(db, tenantId, query)
        return c.json(result, 200)
    }
)

purchase.get(
    "/archieve",
    verifyToken,
    zValidator("query", PurchaseQuerySchema),
    async (c) => {
        const {tenantId} = c.get("user")
        const db = connectDB(c.env.DATABASE_URL)
        const query = c.req.valid("query")
        const result = await PurchasesService.getArchievePurchases(db, tenantId, query)
        return c.json(result, 200)
    }
)

purchase.get(
    "/:purchaseId",
    verifyToken,
    async (c) => {
        const { tenantId } = c.get("user")
        const purchaseId = c.req.param("purchaseId")
        const db = connectDB(c.env.DATABASE_URL)
        const result = await PurchasesService.getPurchaseExpenseDetails(db, purchaseId, tenantId)
        return c.json(result, 200)
    }
)

purchase.patch(
    "/:purchaseId",
    verifyToken,
    verifyRole("OWNER", "ADMIN"),
    zValidator("json", ArchievePurchaseSchema, (parsed) => {
        if (!parsed.success) {
            const flatten = z.flattenError(parsed.error)
            throw new HttpError(422, "Validation error", flatten.fieldErrors)
        }
    }),
    async (c) => {
        const {tenantId, username} = c.get("user")
        const purchaseId = c.req.param("purchaseId")
        const db = connectDB(c.env.DATABASE_URL)
        const payload = c.req.valid("json")
        const result = await PurchasesService.archievePurchase(db, {id: purchaseId, tenantId}, payload, username)
        return c.json(result, 200)
    }
)

export default purchase;
