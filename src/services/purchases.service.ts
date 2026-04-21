import { eq, and, ilike, gte, lte, desc, count, sql } from "drizzle-orm";
import {
  expensePurchase,
  type ExpensePurchase,
} from "../db/schema/expense-purchase";
import type {
  ExpenseQuery,
  ExpensePurchasePayload,
  UpdateExpenseOperationalPayload,
  ArchievePurchasePayload
} from "../validators/expense.schema";
import type {CreatePurchaseQuery, PurchaseQuery} from "../validators/purchase.schema"
import { expensePurchaseItems } from "../db/schema/expense-purchaseItem";
import { stockMovement } from "../db/schema/stock-movement";
import { products } from "../db/schema/products";
import type { DbClient } from "../db";
import { HttpError } from "../middlewares/HttpError";
import { DatabaseError } from "@neondatabase/serverless";
import { suppliers } from "../db/schema/supplier";

export class PurchasesService {
  static async getPurchaseExpenses(
    db: DbClient,
    tenantId: ExpensePurchase["tenantId"],
    query: PurchaseQuery
  ) {
    const { invoice, page = 1, limit = 25, startDate, endDate } = query;
    const offset = (page - 1) * limit;

    const condition = [
      eq(expensePurchase.tenantId, tenantId),
      eq(expensePurchase.isDeleted, false),
    ];

    if (invoice) {
      condition.push(ilike(expensePurchase.invoiceNumber, `%${invoice}%`));
    }

    if (startDate) {
      condition.push(gte(expensePurchase.date, new Date(startDate)));
    }

    if (endDate) {
      condition.push(lte(expensePurchase.date, new Date(endDate)));
    }

    const where = and(...condition);

    const [purchases, [{ total }]] = await Promise.all([
      db
        .select({
          id: expensePurchase.id,
          invoice: expensePurchase.invoiceNumber,
          date: expensePurchase.date,
          totalAmount: expensePurchase.totalAmount,
          paid: expensePurchase.paid,
          status: expensePurchase.status,
          supplier: suppliers.name,
        })
        .from(expensePurchase)
        .where(where)
        .leftJoin(suppliers, eq(expensePurchase.supplierId, suppliers.id))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(expensePurchase.date)),
      db.select({ total: count() }).from(expensePurchase).where(where),
    ]);

    return {
      purchases,
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

  static async getPurchaseExpenseDetails(
    db: DbClient,
    purchaseId: ExpensePurchase["id"],
    tenantId: ExpensePurchase["tenantId"]
  ) {
    try {
      const result = await db.query.expensePurchase.findFirst({
        where: and(
          eq(expensePurchase.id, purchaseId),
          eq(expensePurchase.tenantId, tenantId)
        ),
        with: {
          supplier: {
            columns: { name:true },
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
        invoice: result.invoiceNumber,
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
          unit: item.unit.symbol,
          unitCost: item.unitCost,
          total: item.total,
        })),
      };

      return purchase;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw new HttpError(500, "Failed to retrieve expense purchase details");
      }
      throw error;
    }
  }

  static async createNewPurchaseExpense(
    db: DbClient,
    tenantId: ExpensePurchase["tenantId"],
    username: string,
    payload: ExpensePurchasePayload
  ) {
    try {
      const { paid, items } = payload;

      await db.transaction(async (tx) => {
        const isAdded = payload.addToStock === true;

        const itemsWithTotals = items.map((item) => {
          const total = item.quantity * item.unitCost;
          return {
            ...item,
            productId: item.productId ?? null,
            total: String(total.toFixed(2)),
            quantity: String(item.quantity),
            unitCost: String(item.unitCost.toFixed(2)),
          };
        });
        const totalAmount = itemsWithTotals.reduce(
          (sum, item) => sum + parseFloat(item.total),
          0
        );
        if (paid > totalAmount) {
          throw new HttpError(
            400,
            "Paid amount cannot exceed total amount calculated from items"
          );
        }
        const status = paid === totalAmount ? "PAID" : "PARTIALLY_PAID";

        const [newPurchase] = await tx
          .insert(expensePurchase)
          .values({
            ...payload,
            totalAmount: payload.totalAmount.toString(),
            paid: payload.paid.toString(),
            date: new Date(payload.date),
            stockStatus: isAdded ? "STOCKED" : "PENDING",
            status,
            supplierId: payload.supplierId,
            recordedBy: username,
            tenantId,
          })
          .returning();

        await tx.insert(expensePurchaseItems).values(
          itemsWithTotals.map((item) => ({
            ...item,
            purchaseId: newPurchase.id,
          }))
        );

        if (payload.addToStock) {
          const stockedItems = itemsWithTotals.filter(item => item.productId !== null)

          if (stockedItems.length > 0) {
            await tx.insert(stockMovement).values(
              stockedItems.map(item => ({
                productId: item.productId!,
                type: "PURCHASE" as const,
                quantity: item.quantity,
                referenceId: newPurchase.id,
                tenantId
              }))
            )
          }

          await Promise.all(
            stockedItems.map(item => {
              return tx.update(products).set({
                stock: sql`${products.stock} + ${item.quantity}`
              }).where(
                and(
                  eq(products.id, item.productId!),
                  eq(products.tenantId, tenantId)
                )
              )
            })
          )
        }
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

  static async archievePurchase(db:DbClient, purchase: Pick<ExpensePurchase, "id" | "tenantId">, payload: ArchievePurchasePayload, username: string) {
    const purchaseId = purchase.id
    const tenantId = purchase.tenantId
    try {
      const where = and(
        eq(expensePurchase.id, purchaseId),
        eq(expensePurchase.tenantId, tenantId),
        eq(expensePurchase.isDeleted, false)
      )
      const existed = await db.query.expensePurchase.findFirst({
        where,
        columns: {
          id: true
        }
      })
      if (!existed) {
        throw new HttpError(404, "Purchase is exist or already archieve")
      }

      const result = await db.update(expensePurchase).set({
        ...payload,
        deletedBy: username,
        isDeleted: true
      }).where(where)

      if (!result) {
        throw new HttpError(404, "Purchase already archieved")
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw error;
    }
  }

  static async getArchievePurchases(db:DbClient, tenantId: string, query: PurchaseQuery) {
    try {
      const { invoice, page=1, limit=25, startDate, endDate} = query
      const offset = (page - 1) * limit

      const condition = [
        eq(expensePurchase.tenantId, tenantId),
        eq(expensePurchase.isDeleted, true)
      ]

      if (invoice) {
        condition.push(ilike(expensePurchase.invoiceNumber, `%${invoice}%`))
      }

      if (startDate) {
        condition.push(gte(expensePurchase.date, new Date(startDate)))
      }
      if (endDate) {
        condition.push(lte(expensePurchase.date, new Date(endDate)))
      }

      const where = and(...condition)

      const [purchases, [{total}]] = await Promise.all([
        db
        .select({
          id: expensePurchase.id,
          invoice: expensePurchase.invoiceNumber,
          date: expensePurchase.date,
          totalAmount: expensePurchase.totalAmount,
          paid: expensePurchase.paid,
          status: expensePurchase.status,
          supplier: suppliers.name
        })
        .from(expensePurchase)
        .where(where)
        .leftJoin(suppliers, eq(expensePurchase.supplierId, suppliers.id))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(expensePurchase.date)),
        db.select({total: count() }).from(expensePurchase).where(where)
      ])

      return {
        purchases,
        meta: {
          page, limit, total,
          totalPages: Math.ceil(total/limit),
          hasNextPage: page * limit < total,
          hasPrevPage : page > 1
        }
      }
    } catch(error) {
      if (error instanceof HttpError) throw error;
      throw error;
    }
  }

  static async getProductsAndSupplier(db: DbClient, tenantId: string, query: CreatePurchaseQuery) {
    const {product, supplier} = query
    try {
      const productConditions = [
        eq(products.tenantId, tenantId)
      ]
      const supplierConditions = [
        eq(suppliers.tenantId, tenantId)
      ]

      if (product) {
        productConditions.push(ilike(products.name, `%${product}%`))
      }
      if (supplier) {
        supplierConditions.push(ilike(suppliers.name, `%${supplier}%`))
      }

      const productsWhere = and(...productConditions)
      const suppliersWhere = and(...supplierConditions)

      const [productsResult, suppliersResult] = await Promise.all([
        db.select({
          id: products.id,
          name: products.name,
          price: products.price,
          code: products.code
        }).from(products).where(productsWhere).orderBy(desc(products.name)),
        db.select({
          id: suppliers.id,
          name: suppliers.name
        }).from(suppliers).where(suppliersWhere).limit(20).orderBy(desc(suppliers.name))
      ])

      return {
        products: productsResult,
        suppliers: suppliersResult
      }
    } catch(error) {
      if (error instanceof HttpError) throw error;
      throw error;
    }
  }
}
