import { createApp } from "../lib/createApp";
import { z } from "zod";
import { verifyToken } from "../middlewares/verifyToken";
import { verifyRole } from "../middlewares/verifyRole";
import { zValidator } from "@hono/zod-validator";
import { OrderService } from "../services/order.service";
import { connectDB } from "../db";
import {
  OrderQuerySchema,
  CreateOrderSchema,
} from "../validators/order.schema";
import { HttpError } from "../middlewares/HttpError";

const order = createApp();

order.get(
  "/today",
  verifyToken,
  zValidator("query", OrderQuerySchema),
  async (c) => {
    const { tenantId } = c.get("user");
    const db = connectDB(c.env.DATABASE_URL);
    const query = c.req.valid("query");
    const result = await OrderService.getSalesToday(db, tenantId, query);
    return c.json(result, 200);
  }
);

order.get("/:orderId", verifyToken, async (c) => {
  const { tenantId } = c.get("user");
  const id = c.req.param("orderId");
  const db = connectDB(c.env.DATABASE_URL);
  const result = await OrderService.getOrderDetail(db, { id, tenantId });
  return c.json(result, 200);
});

order.post(
  "/cashier",
  verifyToken,
  zValidator("json", CreateOrderSchema, (parsed) => {
    if (!parsed.success) {
      const flatten = z.flattenError(parsed.error);
      throw new HttpError(422, "Validation error", flatten.fieldErrors);
    }
  }),
  async (c) => {
    const { tenantId } = c.get("user");
    const db = connectDB(c.env.DATABASE_URL);
    const payload = c.req.valid("json");
    const result = await OrderService.createOrder(db, tenantId, payload);
    return c.json(result, 201);
  }
);

export default order;
