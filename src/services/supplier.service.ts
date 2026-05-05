import { eq, and, ilike, desc, count, gte, lte } from "drizzle-orm";
import { suppliers, type Supplier } from "../db/schema/supplier";
import { expensePurchase} from "../db/schema/expense-purchase";
import { DbClient } from "../db";
import type {
  CreateSupplierPayload,
  UpdateSupplierPayload,
  SupplierQuery,
  SupplierHistoryQuery
} from "../validators/supplier.schema";
import { HttpError } from "../middlewares/HttpError";

export class SupplierService {
  static async getSuppliers(
    db: DbClient,
    tenantId: Supplier["tenantId"],
    query: SupplierQuery
  ) {
    try {
      const { name, page = 1, limit = 25 } = query;

      const offset = (page - 1) * limit;
      const condition = [eq(suppliers.tenantId, tenantId)];
      if (name) {
        condition.push(ilike(suppliers.name, `${name}%`));
      }
      const where = and(...condition);

      const [result, [{ total }]] = await Promise.all([
        db.query.suppliers.findMany({
          where,
          columns: {
            tenantId: false,
            createdAt: false,
            updatedAt: false,
          },
          limit,
          offset,
          orderBy: desc(suppliers.name),
        }),
        db.select({ total: count() }).from(suppliers).where(where),
      ]);

      return {
        suppliers: result,
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
      throw new HttpError(500, "Failed to fetch supplier list");
    }
  }

  static async getSupplierDetail(db: DbClient, supp: Pick<Supplier, "id" | "tenantId">) {
    try {
      const result = await db.select({
        id: suppliers.id,
        name: suppliers.name,
        phone: suppliers.phone,
        address: suppliers.address,
        notes: suppliers.notes
      }).from(suppliers).where(
        and(
          eq(suppliers.id, supp.id),
          eq(suppliers.tenantId, supp.tenantId)
        )
      )

      return result[0]
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw error;
    }
  }

  static async getSuppliersSelect(db: DbClient, tenantId: string) {
    try {
      const where = eq(suppliers.tenantId, tenantId)
      const result = await db.select({id: suppliers.id, name: suppliers.name}).from(suppliers).where(where).orderBy(desc(suppliers.name))

      return {
        suppliers: result
      }
    } catch(error) {
      if (error instanceof HttpError) throw error;
      throw error;
    }
  }

  static async getSupplierHistory(db: DbClient, supp: Pick<Supplier, "id" | "tenantId">, query: SupplierHistoryQuery) {
    try {
      const {invoice, page=1, limit=25, startDate, endDate} = query
      const offset = (page - 1) * limit

      const condition = [
        eq(expensePurchase.supplierId, supp.id),
        eq(expensePurchase.tenantId, supp.tenantId),
        eq(expensePurchase.isDeleted, false)
      ]
      if (invoice) {
        condition.push(ilike(expensePurchase.invoiceNumber, `%${invoice}%`))
      }
      if (startDate) {
        condition.push(gte(expensePurchase.date, new Date(startDate)));
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        condition.push(lte(expensePurchase.date, end));
      }
      const where = and(...condition)

      const purchases = await db
        .select({
          id: expensePurchase.id,
          supplier: suppliers.name,
          invoice: expensePurchase.invoiceNumber,
          date: expensePurchase.date,
          totalAmount: expensePurchase.totalAmount,
          paid: expensePurchase.paid,
          status: expensePurchase.status,
        })
        .from(expensePurchase)
        .leftJoin(suppliers, eq(expensePurchase.supplierId, suppliers.id))
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(expensePurchase.date))

      const [{total}] = await db
        .select({total: count()})
        .from(expensePurchase)
        .where(where)

      return {
        purchases,
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

  static async CreateSupplier(db: DbClient, tenantId: Supplier["tenantId"], payload: CreateSupplierPayload) {
    try {
      await db.insert(suppliers).values({
        ...payload,
        tenantId
      })

      return {
        message: "New supplier has been added"
      }
    } catch (error) {
      if (error instanceof HttpError) throw error
      throw new HttpError(500, "Failed to create supplier")
    }
  }

  static async UpdateSupplier(db: DbClient, supp: Pick<Supplier, "id" | "tenantId">, payload: UpdateSupplierPayload) {
    try {
      const existed = await db.query.suppliers.findFirst({
        where: and(
          eq(suppliers.id, supp.id),
          eq(suppliers.tenantId, supp.tenantId)
        )
      })
      if (!existed) {
        throw new HttpError(404, "Supplier not found")
      }

      await db.update(suppliers).set(payload).where(
        and(
          eq(suppliers.id, supp.id),
          eq(suppliers.tenantId, supp.tenantId)
        )
      )

      return {
        message: "Supplier has been updated"
      }
    } catch (error) {
      if (error instanceof HttpError) throw error
      throw new HttpError(500, "Failed to update supplier")
    }
  }

  static async deleteSupplier(db: DbClient, supp: Pick<Supplier, "id" | "tenantId">) {
    try {
      const where = and(
        eq(suppliers.id, supp.id),
        eq(suppliers.tenantId, supp.tenantId)
      )

      const existed = await db.query.suppliers.findFirst({where})
      if (!existed) {
        throw new HttpError(404, "Supplier not found")
      }

      await db.delete(suppliers).where(where)

      return {
        message: `${existed.name} has been deleted.`
      }
    } catch (error) {
      if (error instanceof HttpError) throw error
      throw new HttpError(500, "Failed to delete supplier")
    }
  }
}
