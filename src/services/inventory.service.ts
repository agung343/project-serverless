import { eq, and, ne, ilike, count, or } from "drizzle-orm";
import slugify from "slugify";
import { DatabaseError } from "@neondatabase/serverless";
import { categories, type Category } from "../db/schema/categories";
import { products, type Product } from "../db/schema/products";
import { type DbClient } from "../db";
import type {
  CategoryPayload,
  ProductPayload,
  UpdateProductPayload,
} from "../validators/inventory.schema";
import { HttpError } from "../middlewares/HttpError";
import { isDbError } from "../lib/db-error";

export type GetProductsQuery = {
  search?: string;
  page?: number;
  limit?: number;
};

export class InventoryService {
  static async getCategories(db: DbClient, tenantId: Category["tenantId"]) {
    return await db.query.categories.findMany({
      where: eq(categories.tenantId, tenantId),
      columns: {
        id: true,
        name: true,
      },
    });
  }

  static async createNewCategory(
    db: DbClient,
    payload: CategoryPayload,
    tenantId: string
  ) {
    try {
      const newSlug = slugify(payload.name, { lower: true });

      const [newCategory] = await db
        .insert(categories)
        .values({
          ...payload,
          slug: newSlug,
          tenantId,
        })
        .returning();

      return {
        category: newCategory.name,
      };
    } catch (error) {
      if (isDbError(error) && error.code === "23505") {
        if (error.constraint === "categories_tenant_id_slug_unique") {
          throw new HttpError(409, "Category already exist");
        }
      }
    }
  }

  static async getAllProducts(
    db: DbClient,
    tenantId: string,
    query: GetProductsQuery = {}
  ) {
    const { page = 1, limit = 25, search } = query;
    const offset = (page - 1) * limit;

    const condition = [eq(products.tenantId, tenantId)];

    if (search) {
      condition.push(ilike(products.name, `%${search}%`));
    }
    const where = and(...condition);

    const [data, [{ total }]] = await Promise.all([
      db.query.products.findMany({
        where,
        with: {
          category: {
            columns: { id: true, name: true },
          },
          unit: {
            columns: { symbol: true },
          },
        },
        limit,
        offset,
        orderBy: (products, { asc }) => [asc(products.name)],
      }),
      db.select({ total: count() }).from(products).where(where),
    ]);

    const mapped = data.map((product) => ({
      id: product.id,
      name: product.name,
      code: product.code,
      price: product.price,
      cost: product.cost,
      description: product.description,
      stock: product.stock,
      unit: product.unit?.symbol,
      category: {
        id: product.category.id,
        name: product.category.name,
      },
    }));

    return {
      products: mapped,
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
        hasNextPage: page < Math.ceil(Number(total) / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  static async getProductDetail(
    db: DbClient,
    tenantId: string,
    productId: Product["id"]
  ) {
    const result = await db.query.products.findFirst({
      where: and(eq(products.id, productId), eq(products.tenantId, tenantId)),
      with: {
        category: {
          columns: { id: true, name: true },
        },
      },
    });
    if (!result) {
      throw new HttpError(400, "Product not existed.");
    }

    const product = {
      id: result.id,
      name: result.name,
      code: result.code,
      category: {
        id: result.category.id,
        name: result.category.name,
      },
      price: result.price,
      cost: result.cost,
      description: result.description,
    };

    return product;
  }

  static async getProductsForCashier(
    db: DbClient,
    tenantId: string,
    search?: string
  ) {
    const condition = [eq(products.tenantId, tenantId)];

    if (search) {
      condition.push(
        or(ilike(products.name, `%${search}%`), eq(products.code, search))!
      );
    }

    return await db.query.products.findMany({
      where: and(...condition),
      columns: {
        id: true,
        name: true,
        code: true,
        price: true,
      },
      limit: 20,
    });
  }

  static async createNewProducts(
    db: DbClient,
    payload: ProductPayload,
    tenantId: Product["tenantId"]
  ) {
    const inputSlug = slugify(payload.name, { lower: true, trim: true });
    try {
      const [product] = await db
        .insert(products)
        .values({
          ...payload,
          slug: inputSlug,
          tenantId,
        })
        .returning();

      return {
        message: `${product.name} has been added`,
      };
    } catch (error) {
      if (error instanceof DatabaseError && error.code === "23505") {
        if (error.constraint?.includes("slug"))
          throw new HttpError(409, "Product name already existed.");
        if (error.constraint?.includes("code"))
          throw new HttpError(409, "Product code already existed.");
        throw new HttpError(409, "Duplicate product data");
      }
      throw error;
    }
  }

  static async updateProduct(
    db: DbClient,
    payload: UpdateProductPayload,
    tenantId: Product["tenantId"],
    productId: string
  ) {
    const existed = await db.query.products.findFirst({
      where: and(eq(products.id, productId), eq(products.tenantId, tenantId)),
    });
    if (!existed) {
      throw new HttpError(404, "Product not found");
    }

    let slug = existed.slug;
    if (payload.name && payload.name !== existed.name) {
      slug = slugify(payload.name, { lower: true, trim: true });
    }

    const updateData: Partial<typeof existed> = {
      ...payload,
      slug,
    };

    for (const key in updateData) {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    }

    if ("description" in updateData) {
      updateData.description =
        updateData.description === "" ? null : updateData.description;
    }

    try {
      const [updated] = await db
        .update(products)
        .set(updateData)
        .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
        .returning();

      if (!updated) {
        throw new HttpError(500, "Failed to update product");
      }

      return {
        message: `${updated.name} has been updated`,
      };
    } catch (error) {
      if (error instanceof DatabaseError) {
        if (error.code === "23505") {
          if (error.constraint?.includes("slug")) {
            throw new HttpError(409, "Product name already exists");
          }
          if (error.constraint?.includes("code")) {
            throw new HttpError(409, "Product code already exists");
          }

          throw new HttpError(409, "Duplicate product data");
        }
      }
      throw error;
    }
  }
}
