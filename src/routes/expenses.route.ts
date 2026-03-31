import z from "zod";
import { createApp } from "../lib/createApp";
import { verifyToken } from "../middlewares/verifyToken";
import { validator } from "hono/validator";
import { zValidator } from "@hono/zod-validator";
import { connectDB } from "../db";
import { ExpenseService } from "../services/expense.service";
import {
  CreateNewExpenseOperationalSchema,
  ExpenseQuerySchema
} from "../validators/expense.schema";
import { HttpError } from "../middlewares/HttpError";

const expense = createApp();

expense.get(
  "/operational",
  verifyToken,
  zValidator("query", ExpenseQuerySchema),
  async (c) => {
    const { tenantId } = c.get("user");
    const db = connectDB(c.env.DATABASE_URL);
    const query = c.req.valid("query");
    const result = await ExpenseService.getOperationalExpenses(
      db,
      tenantId,
      query
    );
    return c.json(result);
  }
);

expense.post(
  "/operational",
  verifyToken,
  validator("json", (value) => {
    const parsed = CreateNewExpenseOperationalSchema.safeParse(value);
    if (!parsed.success) {
      const flatten = z.flattenError(parsed.error);
      throw new HttpError(422, "Validation failed", flatten.fieldErrors);
    }
    return parsed.data;
  }),
  async (c) => {
    const { tenantId } = c.get("user");
    const db = connectDB(c.env.DATABASE_URL);
    const payload = c.req.valid("json");
    const result = await ExpenseService.createNewOperationalExpense(
      db,
      payload,
      tenantId
    );
    return c.json(result);
  }
);

export default expense;
