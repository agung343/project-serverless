import {
  eq,
  and,
  ilike,
  desc,
  count,
  gte,
  lte,
  sql,
  inArray,
} from "drizzle-orm";
import { orders, type Order } from "../db/schema/orders";
import { orderItems } from "../db/schema/orderItems";
import { products } from "../db/schema/products";
import type { DbClient } from "../db";
import type { OrderQuery, EditeOrderPayload, DeleteOrderPayload } from "../validators/order.schema";
import { HttpError } from "../middlewares/HttpError";
import { stockMovement } from "../db/schema/stock-movement";

export class SalesService {
  static async getAllSales(
    db: DbClient,
    tenantId: Order["tenantId"],
    query: OrderQuery
  ) {
    try {
      const { invoice, page = 1, limit = 25, startDate, endDate } = query;
      const offset = (page - 1) * limit;

      const condition = [
        eq(orders.tenantId, tenantId),
        eq(orders.isDeleted, false),
      ];

      if (invoice) {
        condition.push(ilike(orders.invoiceNumber, `%${invoice}%`));
      }
      if (startDate) {
        condition.push(gte(orders.date, new Date(startDate)));
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        condition.push(lte(orders.date, end));
      }

      const where = and(...condition);

      const [result, [{ total }]] = await Promise.all([
        db.query.orders.findMany({
          where,
          limit,
          offset,
          orderBy: desc(orders.date),
          columns: {
            tenantId: false,
            createdAt: false,
            updatedAt: false,
            isDeleted: false,
          },
        }),
        db.select({ total: count() }).from(orders).where(where),
      ]);

      const sales = result.map((res) => ({
        id: res.id,
        invoiceNumber: res.invoiceNumber,
        date: res.date,
        status: res.status,
        totalAmount: res.totalAmount.split(",")[0],
        paymentType: res.paymentType,
      }));

      return {
        sales,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      if (error instanceof HttpError) throw error;
    }
  }

  static async archieveDeleteSale(
    db: DbClient,
    ord: Pick<Order, "id" | "tenantId">,
    payload: DeleteOrderPayload
  ) {
    try {
      const where = and(eq(orders.id, ord.id), eq(orders.tenantId, ord.tenantId));

      const existed = await db.query.orders.findFirst({
        where,
      });
      if (!existed) {
        throw new HttpError(404, "Sale not existed");
      }

      const result = await db.transaction(async (tx) => {
        const [archieved] = await tx
          .update(orders)
          .set({
            ...payload,
            isDeleted: true,
          })
          .where(where)
          .returning();

        // restoring stock
        const archievedItems = await tx.query.orderItems.findMany({
          where: eq(orderItems.orderId, archieved.id),
        });
        await Promise.all(
          archievedItems.map((item) =>
            tx
              .update(products)
              .set({
                stock: sql`${products.stock} + ${item.quantity}::numeric`,
              })
              .where(
                and(
                  eq(products.id, item.productId),
                  eq(products.tenantId, ord.tenantId)
                )
              )
          )
        );
        if (archievedItems.length > 0) {
          await tx.insert(stockMovement).values(
            archievedItems.map((item) => ({
              productId: item.productId,
              tenantId: ord.tenantId,
              type: "ADJUSTMENT" as const,
              quantity: item.quantity,
              note: "Archived Sale",
            }))
          );
        }

        return {
          archieved,
        };
      });

      return {
        message: `${result.archieved.invoiceNumber} has been moved to archieve`,
      };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw error;
    }
  }

  static async editSale(
    db: DbClient,
    ord: Pick<Order, "id" | "tenantId">,
    payload: EditeOrderPayload
  ) {
    try {
      const existed = await db.query.orders.findFirst({
        where: and(
          eq(orders.tenantId, ord.tenantId),
          eq(orders.id, ord.id),
          eq(orders.isDeleted, false)
        ),
      });
      if (!existed) {
        throw new HttpError(400, "Sale not recorded");
      }

      const { items, paid } = payload;

      const result = await db.transaction(async (tx) => {
        const productIds = items.map((i) => i.productId);
        const existingProducts = await tx
          .select({
            id: products.id,
            price: products.price,
            name: products.name,
          })
          .from(products)
          .where(
            and(
              inArray(products.id, productIds),
              eq(products.tenantId, ord.tenantId)
            )
          );

        if (existingProducts.length !== productIds.length) {
          const foundIds = new Set(existingProducts.map((p) => p.id));
          const missing = productIds.filter((id) => !foundIds.has(id));
          throw new Error(`Missing product: ${missing.join(", ")}`);
        }

        const itemsWithTotals = items.map((item) => {
          const total = item.quantity * item.unitPrice;
          return {
            ...item,
            total: String(total.toFixed(2)),
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
          };
        });

        const totalAmount = items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );

        const status =
          paid >= totalAmount
            ? "PAID"
            : paid > 0
            ? "PARTIALLY_PAID"
            : "ORDERED";

        const oldItems = await tx.query.orderItems.findMany({
          where: eq(orderItems.orderId, ord.id),
        });
        await Promise.all(
          oldItems.map((item) =>
            tx
              .update(products)
              .set({
                stock: sql`${products.stock} + ${item.quantity}::numeric`,
              })
              .where(eq(products.id, item.productId))
          )
        );

        await tx.delete(orderItems).where(eq(orderItems.orderId, ord.id));

        await Promise.all(
          itemsWithTotals.map((item) =>
            tx
              .update(products)
              .set({
                stock: sql`${products.stock} - ${item.quantity}::numeric`,
              })
              .where(
                and(
                  eq(products.id, item.productId),
                  eq(products.tenantId, ord.tenantId),
                  sql`${products.stock} >= ${item.quantity}::numeric`
                )
              )
          )
        );

        await tx.insert(orderItems).values(
          itemsWithTotals.map((item) => ({
            ...item,
            orderId: ord.id,
          }))
        );

        const [edited] = await tx
          .update(orders)
          .set({
            ...payload,
            totalAmount: String(totalAmount.toFixed(2)),
            paid: String(paid),
            status,
            paymentType: payload.paymentType ?? existed.paymentType,
          })
          .where(and(eq(orders.id, ord.id), eq(orders.tenantId, ord.tenantId)))
          .returning();

        if (!edited) {
          throw new HttpError(404, "Order not found during update");
        }

        return {edited, itemsWithTotals, existingProducts}
      });
      const {edited, itemsWithTotals, existingProducts} = result
      const sale = {
        invoice: edited.invoiceNumber,
        date: edited.date,
        status: edited.status,
        totalAmount: edited.totalAmount,
        paid: edited.paid,
        items: itemsWithTotals.map(item => {
          const product = existingProducts.find(p => p.id === item.productId)
          return {
            productId: item.productId,
            name: product?.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          }
        })
      }
      return {
        sale,
        message: `${edited.invoiceNumber} has been edited`
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw error;
    }
  }

  static async getSalesArchieve(db: DbClient, tenantId: string, query: OrderQuery) {
    try {
      const {invoice, page=1, limit=25} = query
      const offset = (page - 1) * limit

      const condition = [eq(orders.tenantId, tenantId), eq(orders.isDeleted, true)]
      if (invoice) {
          condition.push(ilike(orders.invoiceNumber, `%${invoice}%`))
      }

      const where = and(...condition)

      const [sales, [{total}]] = await Promise.all([
        db.select({
          id: orders.id,
          invoiceNumber: orders.invoiceNumber,
          date: orders.date,
          paid: orders.paid,
          totalAmount: orders.totalAmount,
          paymentType: orders.paymentType,
          notes: orders.notes
        }).from(orders).where(where).limit(limit).offset(offset).orderBy(desc(orders.date)),
        db.select({total: count()}).from(orders).where(where)
      ])

      return {
        sales,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total/limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw error;
    }
  }
}
