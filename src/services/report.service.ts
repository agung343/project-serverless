import { eq, and, sql, desc, ilike, countDistinct, gte, lte } from "drizzle-orm";
import {
  endOfMonth,
  subYears,
  eachMonthOfInterval,
  format,
  startOfMonth,
} from "date-fns";
import { tenants } from "../db/schema/tenants";
import { orders } from "../db/schema/orders";
import { orderItems } from "../db/schema/orderItems";
import { expensePurchase } from "../db/schema/expense-purchase";
import { expensePurchaseItems } from "../db/schema/expense-purchaseItem";
import { expenseOperational } from "../db/schema/expense-operational";
import { products } from "../db/schema/products";
import { stockMovement } from "../db/schema/stock-movement";
import type { DbClient } from "../db";
import type {
  DashboardQuery,
  TransactionQuery,
} from "../validators/report.schema";
import { HttpError } from "../middlewares/HttpError";
import { DateFilter } from "../lib/date-filter";
import { DatabaseError } from "@neondatabase/serverless";

export class ReportService {
  static async dashboard(
    db: DbClient,
    tenantId: string,
    query: DashboardQuery
  ) {
    const { startDate, endDate, range } = query;
    try {
      const now = new Date();

      const orderDateFilter = DateFilter(
        orders.date,
        range,
        startDate,
        endDate
      );
      const purchaseDateFilter = DateFilter(
        expensePurchase.date,
        range,
        startDate,
        endDate
      );
      const operasionalDateFilter = DateFilter(
        expenseOperational.createdAt,
        range,
        startDate,
        endDate
      );

      const [
        saleTrends,
        purchaseTrends,
        operationalTrends,
        ordersCard,
        purchaseCard,
        operasionalCard,
        limitedStock,
        mostSold,
        topRevenue,
      ] = await Promise.all([
        db
          .select({
            month: sql<Date>`date_trunc('month', ${orders.date})`,
            totalAmount: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`,
          })
          .from(orders)
          .where(and(eq(orders.tenantId, tenantId), orderDateFilter))
          .groupBy(sql`date_trunc('month', ${orders.date})`)
          .orderBy(sql`date_trunc('month', ${orders.date})`),
        db
          .select({
            month: sql<Date>`date_trunc('month', ${expensePurchase.date})`,
            totalAmount: sql<number>`coalesce(sum(${expensePurchase.totalAmount}), 0)`,
          })
          .from(expensePurchase)
          .where(
            and(eq(expensePurchase.tenantId, tenantId), purchaseDateFilter)
          )
          .groupBy(sql`date_trunc('month', ${expensePurchase.date})`)
          .orderBy(sql`date_trunc('month', ${expensePurchase.date})`),
        db
          .select({
            month: sql<Date>`date_trunc('month', ${expenseOperational.createdAt})`,
            totalAmount: sql<number>`coalesce(sum(${expenseOperational.amount}), 0)`,
          })
          .from(expenseOperational)
          .where(
            and(
              eq(expenseOperational.tenantId, tenantId),
              operasionalDateFilter
            )
          )
          .groupBy(sql`date_trunc('month', ${expenseOperational.createdAt})`)
          .orderBy(sql`date_trunc('month', ${expenseOperational.createdAt})`),
        db
          .select({
            totalAmount: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`,
            count: sql<number>`coalesce(count(${orders.id}), 0)`,
          })
          .from(orders)
          .where(and(eq(orders.tenantId, tenantId), orderDateFilter)),
        db
          .select({
            paid: sql<number>`coalesce(sum(${expensePurchase.paid}), 0)`,
            totalAmount: sql<number>`coalesce(sum(${expensePurchase.totalAmount}), 0)`,
          })
          .from(expensePurchase)
          .where(
            and(eq(expensePurchase.tenantId, tenantId), purchaseDateFilter)
          ),
        db
          .select({
            totalAmount: sql<number>`coalesce(sum(${expenseOperational.amount}), 0)`,
          })
          .from(expenseOperational)
          .where(
            and(
              eq(expenseOperational.tenantId, tenantId),
              operasionalDateFilter
            )
          ),
        db.query.products.findMany({
          where: and(eq(products.tenantId, tenantId)),
          columns: {
            id: true,
            name: true,
            stock: true,
          },
          orderBy: (orders, { asc }) => [asc(orders.stock)],
          limit: 5,
        }),
        db
          .select({
            id: orderItems.productId,
            name: products.name,
            quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
          })
          .from(orderItems)
          .innerJoin(products, eq(orderItems.productId, products.id))
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .where(and(eq(orders.tenantId, tenantId), orderDateFilter))
          .groupBy(orderItems.productId, products.name)
          .orderBy(sql`sum(order_items.quantity) desc`)
          .limit(5),
        db
          .select({
            id: orderItems.productId,
            name: products.name,
            total: sql<number>`coalesce(sum(${orderItems.total}), 0)`,
          })
          .from(orderItems)
          .innerJoin(products, eq(orderItems.productId, products.id))
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .where(and(eq(orders.tenantId, tenantId), orderDateFilter))
          .groupBy(orderItems.productId, products.name)
          .orderBy(sql`sum(order_items.total) desc`)
          .limit(5),
      ]);

      const [tenant] = await db
        .select({ createdAt: tenants.createdAt })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      if (!tenant) {
        throw new HttpError(404, "Tenant not found");
      }

      const endMonth = endOfMonth(now);
      const oneYearAgo = subYears(now, 1);
      const rawStart =
        tenant.createdAt > oneYearAgo ? tenant.createdAt : oneYearAgo;
      const trendStart = startDate
        ? startOfMonth(new Date(startDate))
        : startOfMonth(rawStart);
      const allMonths = eachMonthOfInterval({
        start: trendStart,
        end: endMonth,
      });

      const makeKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
      const salesMap = new Map(
        saleTrends.map((t) => [makeKey(new Date(t.month)), t.totalAmount])
      );
      const purchasesMap = new Map(
        purchaseTrends.map((t) => [makeKey(new Date(t.month)), t.totalAmount])
      );
      const operasionalMap = new Map(
        operationalTrends.map((t) => [
          makeKey(new Date(t.month)),
          t.totalAmount,
        ])
      );

      const trends = allMonths.map((d) => {
        const key = makeKey(d);
        return {
          month: format(d, "MMM yyyy"),
          sales: Number(salesMap.get(key) ?? 0),
          purchases: Number(purchasesMap.get(key) ?? 0),
          operasional: Number(operasionalMap.get(key) ?? 0),
        };
      });

      return {
        trends,
        ordersCard: ordersCard[0],
        purchaseCard: purchaseCard[0],
        operasionalCard: operasionalCard[0],
        limitedStock,
        mostSold,
        topRevenue,
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw new HttpError(400, error.message);
      }
      throw error;
    }
  }

  static async salesReport(
    db: DbClient,
    tenantId: string,
    query: TransactionQuery
  ) {
    try {
      const {
        startDate,
        endDate,
        range = "30d",
        product,
        page = 1,
        limit = 25,
      } = query;
      const offset = (page - 1) * limit;

      const condition = [eq(orders.tenantId, tenantId)];
      if (product) {
        condition.push(ilike(products.name, `${product}%`));
      }
      // if (startDate) {
      //   condition.push(gte(orders.date, new Date(startDate)))
      // }
      // if (endDate) {
      //   const end = new Date(endDate)
      //   end.setHours(23,59,59,999)
      //   condition.push(lte(orders.date, end))
      // }

      const saleDateFilter = DateFilter(orders.date, range, startDate, endDate);
      const where = and(...condition, saleDateFilter);

      const day = sql`DATE(${orders.date})`;
      const [sales, [{ total }]] = await Promise.all([
        db
          .select({
            id: orderItems.id,
            invoice: orders.invoiceNumber,
            productId: orderItems.productId,
            product: products.name,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            total: orderItems.total,
            date: day,
          })
          .from(orders)
          .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(where)
          .offset(offset)
          .limit(limit)
          .groupBy(
            day,
            products.name,
            orders.invoiceNumber,
            orderItems.id,
            orderItems.productId,
            orderItems.quantity,
            orderItems.unitPrice,
            orderItems.total
          )
          .orderBy(desc(day), desc(orders.invoiceNumber)),
        db
          .select({
            total: countDistinct(
              sql`${orders.invoiceNumber} || '-' || ${products.id} || '-' || DATE(${orders.date})`
            ),
          })
          .from(orders)
          .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(where),
      ]);

      return {
        sales,
        meta: {
          page,
          limit,
          total,
          totalPage: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw new HttpError(400, error.message);
      }
      throw error;
    }
  }

  static async purchasesReport(
    db: DbClient,
    tenantId: string,
    query: TransactionQuery
  ) {
    try {
      const {
        startDate,
        endDate,
        range = "30d",
        product,
        page = 1,
        limit = 25,
      } = query;
      const offset = (page - 1) * limit;

      const condition = [eq(expensePurchase.tenantId, tenantId)];
      if (product) {
        condition.push(ilike(expensePurchaseItems.name, `%${product}%`));
      }
      const purchaseDateFilter = DateFilter(
        expensePurchase.date,
        range,
        startDate,
        endDate
      );
      const where = and(...condition, purchaseDateFilter);

      const day = sql`DATE(${expensePurchase.date})`;
      const [purchases, [{ total }]] = await Promise.all([
        db
          .select({
            id: expensePurchaseItems.id,
            invoice: expensePurchase.invoiceNumber,
            productId: expensePurchaseItems.productId ?? "",
            product: expensePurchaseItems.name,
            quantity: expensePurchaseItems.quantity,
            unitCost: expensePurchaseItems.unitCost,
            total: expensePurchaseItems.total,
            date: day,
            status: expensePurchase.status,
          })
          .from(expensePurchase)
          .innerJoin(
            expensePurchaseItems,
            eq(expensePurchase.id, expensePurchaseItems.purchaseId)
          )
          .where(where)
          .offset(offset)
          .limit(limit)
          .groupBy(
            day,
            expensePurchaseItems.name,
            expensePurchase.invoiceNumber,
            expensePurchaseItems.id,
            expensePurchaseItems.productId,
            expensePurchaseItems.quantity,
            expensePurchaseItems.unitCost,
            expensePurchaseItems.total,
            expensePurchase.status
          )
          .orderBy(desc(day), desc(expensePurchase.status)),
        db
          .select({
            total: countDistinct(
              sql`${expensePurchase.invoiceNumber} || '-' || ${products.id} || '-' || DATE(${expensePurchase.date})`
            ),
          })
          .from(expensePurchase)
          .innerJoin(
            expensePurchaseItems,
            eq(expensePurchaseItems.purchaseId, expensePurchase.id)
          )
          .innerJoin(products, eq(expensePurchaseItems.productId, products.id))
          .where(where),
      ]);

      return {
        purchases,
        meta: {
          page,
          limit,
          total,
          totalPage: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw new HttpError(400, error.message);
      }
      throw error;
    }
  }
}
