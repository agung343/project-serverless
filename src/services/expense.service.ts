import { eq, and, ilike, gte, lte, desc, count } from "drizzle-orm";
import {
  expenseOperational,
  type ExpenseOperational,
} from "../db/schema/expense-operational";
import { expensePurchase, type ExpensePurchase } from "../db/schema/expense-purchase";
import { expensePurchaseItems } from "../db/schema/expense-purchaseItem";
import { type DbClient } from "../db";
import type { ExpenseOperationalPayload, ExpensePurchasePayload } from "../validators/expense.schema";
import { HttpError } from "../middlewares/HttpError";
import { type ExpenseQuery } from "../validators/expense.schema";
import { DatabaseError } from "@neondatabase/serverless";

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
    const { search, page = 1, limit = 25, startDate, endDate } = query;
    const offset = (page - 1) * limit;

    const condition = [
      eq(expensePurchase.tenantId, tenantId),
      eq(expensePurchase.isDeleted, false)
    ];

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

    const [result, [{ total }]] = await Promise.all([
      db.query.expensePurchase.findMany({
        where,
        limit,
        offset,
        orderBy: desc(expensePurchase.date),
        with: {
          supplier: {
            columns: { name: true },
          },
        },
      }),
      db.select({ total: count() }).from(expensePurchase).where(where),
    ]);

    const mappedResult = result.map((expense) => ({
      id: expense.id,
      invoiceNumber: expense.invoiceNumber,
      totalAmount: expense.totalAmount,
      paid: expense.paid,
      status: expense.status,
      date: expense.date,
      supplier: expense.supplier.name,
    }));

    return {
      purchases: mappedResult,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  static async getPurchaseExpenseDetails(db: DbClient, purchaseId: ExpensePurchase["id"], tenantId: ExpensePurchase["tenantId"]) {
    try {
      const result = await db.query.expensePurchase.findFirst({
        where: and(
          eq(expensePurchase.id, purchaseId),
          eq(expensePurchase.tenantId, tenantId)
        ),
        with: {
          supplier: {
            columns: {name: true}
          },
          items: {
            with: {
              unit: true,
            },
          },
        },
      });

      if (!result) {
        throw new HttpError(404, "Expense purchase not found");
      }

      const purchase = {
        id: result.id,
        invoiceNumber: result.invoiceNumber,
        totalAmount: result.totalAmount,
        paid: result.paid,
        status: result.status,
        date: result.date,
        notes: result.notes,
        supplier: result.supplier.name,
        items: result.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit.name,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      }

      return purchase;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw new HttpError(500, "Failed to retrieve expense purchase details");
      }
      throw error;
    }
  }

  static async createNewPurchaseExpense(db: DbClient, tenantId: ExpensePurchase["tenantId"], payload: ExpensePurchasePayload) {
    try {
     await db.transaction(async (tx) => {
        const [newPurchase] = await tx
          .insert(expensePurchase)
          .values({
            invoiceNumber: payload.invoiceNumber,
            totalAmount: payload.totalAmount.toString(),
            paid: payload.paid.toString(),
            date: new Date(payload.date),
            notes: payload.notes,
            supplierId: payload.supplierId,
            tenantId,
          })
          .returning();

        const purchaseItems = payload.items.map((item) => ({
          purchaseId: newPurchase.id,
          name: item.name,
          quantity: item.quantity.toString(),
          unitId: item.unitId,
          unitPrice: item.unitPrice.toString(),
          total: (item.quantity * item.unitPrice).toString(),
        }));

        await tx.insert(expensePurchaseItems).values(purchaseItems);
      });

      return {
        message: "Expense purchase created successfully",
      };  
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw new HttpError(500, "Failed to create expense purchase");
      }
      throw error;
    }
  }
}
