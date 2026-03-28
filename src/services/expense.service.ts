import { eq, and, ilike, gte, lte, desc, count } from "drizzle-orm";
import {
  expenseOperational,
  type ExpenseOperational,
} from "../db/schema/expense-operational";
import { expensePurchase, type ExpensePurchase } from "../db/schema/expense-purchase";
import { type DbClient } from "../db";
import type { ExpenseOperationalPayload } from "../validators/expense.schema";
import { HttpError } from "../middlewares/HttpError";
import { type ExpenseQuery } from "../validators/expense.schema";
import { DatabaseError } from "pg";

export class ExpenseService {
  static async getOperationalExpenses(
    db: DbClient,
    tenantId: ExpenseOperational["tenantId"],
    query: ExpenseQuery
  ) {
    const { search, page = 1, limit = 25, startDate, endDate } = query;
    const offset = (page - 1) * limit;

    const condition = [eq(expenseOperational.tenantId, tenantId)];

    if (search) {
      condition.push(ilike(expenseOperational.name, `%${search}%`));
    }

    if (startDate) {
      condition.push(gte(expenseOperational.createdAt, new Date(startDate)));
    }

    if (endDate) {
      condition.push(lte(expenseOperational.createdAt, new Date(endDate)));
    }

    const where = and(...condition);

    const [result, [{ total }]] = await Promise.all([
      db.query.expenseOperational.findMany({
        where,
        limit,
        offset,
        orderBy: desc(expenseOperational.createdAt),
      }),
      db.select({ total: count() }).from(expenseOperational).where(where),
    ]);

    const mappedResult = result.map((expense) => ({
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      date: expense.createdAt,
      description: expense.description,
    }));

    return {
      operationals: mappedResult,
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
        hasNextPage: page * limit < Number(total),
        hasPrevPage: page > 1,
      },
    };
  }

  static async createNewOperationalExpense(
    db: DbClient,
    payload: ExpenseOperationalPayload,
    tenantId: string
  ) {
    try {
      const [newExpense] = await db
        .insert(expenseOperational)
        .values({
          ...payload,
          tenantId,
        })
        .returning();

      return {
        message: "Operational expense created successfully",
      };
    } catch (error) {
      throw new HttpError(500, "Failed to create operational expense");
    }
  }

  static async getPurchaseExpenses(db: DbClient, tenantId: ExpensePurchase["tenantId"], query: ExpenseQuery) {
    try {
      const { search, page = 1, limit = 25, startDate, endDate } = query;
      const offset = (page - 1) * limit;

      const condition = [eq(expensePurchase.tenantId, tenantId)];
      if (search) {
        condition.push(ilike(expensePurchase.invoiceNumber, `%${search}%`));
      }

      if (startDate) {
        condition.push(gte(expensePurchase.date, new Date(startDate)));
      }

      if (endDate) {
        condition.push(lte(expensePurchase.date, new Date(endDate)));
      }

      const where = and(...condition);
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw new HttpError(500, "Failed to fetch purchase expenses");
      }
      throw error;
    }
  }
}
