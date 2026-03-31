import { eq, and, ilike, gte, lte, desc, count, sql } from "drizzle-orm";
import {
  expenseOperational,
  type ExpenseOperational,
} from "../db/schema/expense-operational";
import {
  expensePurchase,
  type ExpensePurchase,
} from "../db/schema/expense-purchase";
import { expensePurchaseItems } from "../db/schema/expense-purchaseItem";
import { stockMovement } from "../db/schema/stock-movement";
import { products } from "../db/schema/products";
import { type DbClient } from "../db";
import type {
  ExpenseOperationalPayload,
  ExpensePurchasePayload,
} from "../validators/expense.schema";
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

  static async getPurchaseExpenses(
    db: DbClient,
    tenantId: ExpensePurchase["tenantId"],
    query: ExpenseQuery
  ) {
    try {
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

      const [result, [{total}]] = await Promise.all([
        db.query.expensePurchase.findMany({
          where,
          with: {
            supplier: {
              columns: {
                name: true
              }
            }
          },
          limit,
          offset,
          orderBy: desc(expensePurchase.date)
        }),
        db.select({total: count()}).from(expensePurchase).where(where)
      ])

      const mappedResult = result.map(p => ({
        id: p.id,
        invoice: p.invoiceNumber,
        supplier: p.supplier.name,
        totalAmount: p.totalAmount,
        paid: p.paid,
        status: p.status,
        note: p.notes
      }))

      return {
        purchases: mappedResult,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil (total/limit),
          hasNextPage: page *limit < total,
          hasPrevPage: page > 1
        }
      }
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw new HttpError(500, "Failed to fetch purchase expenses");
      }
      throw error;
    }
  }

  static async createNewExpensePurchase(
    db: DbClient,
    tenantId: ExpensePurchase["tenantId"],
    payload: ExpensePurchasePayload
  ) {
    try {
      const totalAmount = payload.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      await db.transaction(async (tx) => {
        const [newPurchase] = await tx
          .insert(expensePurchase)
          .values({
            ...payload,
            date: new Date(payload.date),
            totalAmount: String(totalAmount),
            paid: String(payload.paid),
            tenantId,
          })
          .returning();

        const purchaseItems = payload.items.map((item) => ({
          purchaseId: newPurchase.id,
          name: item.name,
          productId: item.productId,
          quantity: String(item.quantity),
          unitId: Number(item.unitId),
          unitPrice: String(item.unitPrice),
          total: String(item.quantity * item.unitPrice),
        }));

        await tx.insert(expensePurchaseItems).values(purchaseItems);

        const itemWithProduct = payload.items.filter((item) => item.productId);
        if (itemWithProduct.length > 0) {
          const movements = itemWithProduct.map((item) => ({
            productId: item.productId!,
            type: "PURCHASE" as const,
            quantity: String(item.quantity),
            referenceId: newPurchase.id,
            note: `From purchase invoice ${payload.invoiceNumber}`,
            tenantId,
          }));

          await tx.insert(stockMovement).values(movements);
        }

        // updating stock
        for (const item of itemWithProduct) {
          await tx
            .update(products)
            .set({ stock: sql`${products.stock} + ${item.quantity}` })
            .where(
              and(
                eq(products.id, item.productId!),
                eq(products.tenantId, tenantId)
              )
            );
        }
      });

      return {
        message: "New Purchase has been recorded",
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw new HttpError(500, "Failed to Record Purchase");
      }
    }
  }
}
