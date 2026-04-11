import { eq, and, ilike, inArray, sql, desc, count, gte, lte } from "drizzle-orm";
import { orders, type Order } from "../db/schema/orders";
import { orderItems } from "../db/schema/orderItems";
import { products } from "../db/schema/products";
import { stockMovement } from "../db/schema/stock-movement";
import type { DbClient } from "../db";
import { generateInvoiceNumber } from "../lib/generate-invoice";
import type {
  OrderQuery,
  CreateOrderPayload,
} from "../validators/order.schema";
import { HttpError } from "../middlewares/HttpError";

export class OrderService {
  static async createOrder(
    db: DbClient,
    tenantId: Order["tenantId"],
    payload: CreateOrderPayload
  ) {
    try {
      const { paid, items } = payload;

      const result = await db.transaction(async (tx) => {
        // validate items
        const productIds = items.map((i) => i.productId);
        const existingProducts = await tx
          .select({ id: products.id, price: products.price, name: products.name })
          .from(products)
          .where(
            and(
              inArray(products.id, productIds),
              eq(products.tenantId, tenantId)
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

        const invoiceNumber = await generateInvoiceNumber(tx, tenantId);
        const totalAmount = items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );
        const status = paid === totalAmount ? "PAID" : "PARTIALLY_PAID";

        const [order] = await tx
          .insert(orders)
          .values({
            ...payload,
            invoiceNumber,
            totalAmount: String(totalAmount),
            tenantId,
            paid: String(paid),
            status,
            date: new Date(),
          })
          .returning();

        await tx.insert(orderItems).values(
          itemsWithTotals.map((item) => ({
            ...item,
            orderId: order.id,
          }))
        );

        // ledger history
        await tx.insert(stockMovement).values(
          itemsWithTotals.map((item) => ({
            productId: item.productId,
            type: "SALE" as const,
            quantity: String(item.quantity),
            referenceId: order.id,
            tenantId,
          }))
        );

        // update product stock
        await Promise.all(
          itemsWithTotals.map((item) => {
            return tx
              .update(products)
              .set({
                stock: sql`${products.stock} - ${item.quantity}`,
              })
              .where(
                and(
                  eq(products.id, item.productId),
                  eq(products.tenantId, tenantId)
                )
              );
          })
        );

        return {order, itemsWithTotals, existingProducts};
      });
      const {order, itemsWithTotals, existingProducts} = result
      const sale = {
        invoice: order.invoiceNumber,
        date: order.date,
        status: order.status,
        totalAmount: order.totalAmount,
        paid: order.paid,
        note: order.notes,
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
        message: `${order.id} has been saved`,
      };
    } catch (error) {
      if (error instanceof HttpError) throw error;
    }
  }

  static async getSalesToday(
    db: DbClient,
    tenantId: Order["tenantId"],
    query: OrderQuery
  ) {
    const { invoice, page = 1, limit = 25 } = query;
    const offset = (page - 1) * limit;

    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0,0,0,0)
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23,59,59,999)
    const condition = [
      eq(orders.tenantId, tenantId),
      gte(orders.date, startDate),
      lte(orders.date, endDate),
      eq(orders.isDeleted, false),
    ];

    if (invoice) {
      condition.push(ilike(orders.invoiceNumber, `%${invoice}%`));
    }

    const where = and(...condition);

    try {
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

      return {
        orders: result,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, "Failed to save order");
    }
  }

  static async getOrderDetail(
    db: DbClient,
    ord: Pick<Order, "id" | "tenantId">
  ) {
    try {
      const existed = await db
        .select({
          id: orders.id,
          invoice: orders.invoiceNumber,
          date: orders.date,
          status: orders.status,
          totalAmount: orders.totalAmount,
          paid: orders.paid,
          notes: orders.notes,
          items: {
            id: orderItems.id,
            productId: orderItems.productId,
            name: products.name,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            total: orderItems.total,
          },
        })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(and(eq(orders.id, ord.id), eq(orders.tenantId, ord.tenantId)));

      if (!existed) {
        throw new HttpError(404, "Order not found");
      }

      const order = {
        ...existed[0],
        items: existed.map((row) => row.items),
      };

      return {
        order,
      };
    } catch (error) {}
  }
}
