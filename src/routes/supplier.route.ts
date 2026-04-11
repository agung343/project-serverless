import { createApp } from "../lib/createApp";
import { z } from "zod";
import { verifyRole } from "../middlewares/verifyRole";
import { verifyToken } from "../middlewares/verifyToken";
import { zValidator } from "@hono/zod-validator";
import {
  SupplierQuerySchema,
  CreateSupplierSchema,
  UpdateSupplierSchema,
} from "../validators/supplier.schema";
import { connectDB } from "../db";
import { SupplierService } from "../services/supplier.service";
import { HttpError } from "../middlewares/HttpError";

const supplier = createApp();

supplier.get(
  "/",
  verifyToken,
  zValidator("query", SupplierQuerySchema),
  async (c) => {
    const { tenantId } = c.get("user");
    const db = connectDB(c.env.DATABASE_URL);
    const query = c.req.valid("query");
    const result = await SupplierService.getSuppliers(db, tenantId, query);
    return c.json(result, 200);
  }
);

supplier.post(
  "/",
  verifyToken,
  verifyRole("OWNER", "ADMIN"),
  zValidator("json", CreateSupplierSchema, (parsed) => {
    if (!parsed.success) {
      const flatten = z.flattenError(parsed.error);
      throw new HttpError(422, "Validation failed", flatten.fieldErrors);
    }
  }),
  async (c) => {
    const { tenantId } = c.get("user");
    const db = connectDB(c.env.DATABASE_URL);
    const payload = c.req.valid("json");
    const result = await SupplierService.CreateSupplier(db, tenantId, payload);
    return c.json(result, 201);
  }
);

supplier.put(
    "/:supplierId",
    verifyToken,
    verifyRole("OWNER", "ADMIN"),
    zValidator("json", UpdateSupplierSchema, (parsed) => {
        if (!parsed.success) {
            const flatten = z.flattenError(parsed.error)
            throw new HttpError(422, "Validation failed", flatten.fieldErrors)
        }
    }),
    async (c) => {
        const { tenantId } = c.get("user")
        const supplierId = c.req.param("supplierId")
        const db = connectDB(c.env.DATABASE_URL)
        const payload = c.req.valid("json")
        const result = await SupplierService.UpdateSupplier(db, {tenantId, id: supplierId}, payload)
        return c.json(result, 200)
    }
)

supplier.delete(
    "/:supplierId",
    verifyToken,
    verifyRole("OWNER", "ADMIN"),
    async (c) => {
        const {tenantId} = c.get("user")
        const supplierId = c.req.param("supplierId")
        const db = connectDB(c.env.DATABASE_URL)
        const result = await SupplierService.deleteSupplier(db, {tenantId, id: supplierId})
        return c.json(result, 200)
    }
)

export default supplier;
