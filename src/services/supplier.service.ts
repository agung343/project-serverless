import { eq, and, ilike, desc, count } from "drizzle-orm";
import { suppliers, type Supplier } from "../db/schema/supplier";
import { DbClient } from "../db";
import type {
  CreateSupplierPayload,
  UpdateSupplierPayload,
  SupplierQuery,
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
        condition.push(ilike(suppliers.name, `%${name}%`));
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
          eq(suppliers.name, supp.id),
          eq(suppliers.tenantId, supp.tenantId)
        )
      })
      if (!existed) {
        throw new HttpError(404, "Supplier not found")
      }

      await db.update(suppliers).set(payload)

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
