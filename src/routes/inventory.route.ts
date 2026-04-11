import { createApp } from "../lib/createApp";
import { z } from "zod";
import { validator } from "hono/validator";
import { zValidator } from "@hono/zod-validator";
import { connectDB } from "../db";
import { verifyToken } from "../middlewares/verifyToken";
import { InventoryService } from "../services/inventory.service";
import {
  ProductQuerySchema,
  CreateNewCategorySchema,
  CreateNewProductSchema,
  UpdateProductSchema,
  AdjustStockSchema,
} from "../validators/inventory.schema";
import { HttpError } from "../middlewares/HttpError";
import { verifyRole } from "../middlewares/verifyRole";

const PaginationProductSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

const inventory = createApp();

inventory.get("/category", verifyToken, async (c) => {
  const db = connectDB(c.env.DATABASE_URL);
  const { tenantId } = c.get("user");
  const categories = await InventoryService.getCategories(db, tenantId);
  return c.json({ categories }, 200);
});

inventory.get(
  "/products",
  verifyToken,
  zValidator("query", PaginationProductSchema),
  async (c) => {
    const { tenantId } = c.get("user");
    const db = connectDB(c.env.DATABASE_URL);
    const query = c.req.valid("query");
    const result = await InventoryService.getAllProducts(db, tenantId, query);
    return c.json(result, 200);
  }
);

inventory.get(
  "/cashier",
  verifyToken,
  zValidator("query", PaginationProductSchema),
  async (c) => {
    const { tenantId } = c.get("user");
    const db = connectDB(c.env.DATABASE_URL);
    const { search } = c.req.valid("query");
    const result = await InventoryService.getProductsForCashier(
      db,
      tenantId,
      search
    );
    return c.json({ products: result }, 200);
  }
);

inventory.get(
  "/stock",
  verifyToken,
  zValidator("query", ProductQuerySchema),
  async (c) => {
    const { tenantId } = c.get("user");
    const db = connectDB(c.env.DATABASE_URL);
    const query = c.req.valid("query");
    const result = await InventoryService.getStockMovement(db, tenantId, query);
    return c.json(result, 200);
  }
);

inventory.get("/product/:productId", verifyToken, async (c) => {
  const { tenantId } = c.get("user");
  const productId = c.req.param("productId");
  const db = connectDB(c.env.DATABASE_URL);
  const result = await InventoryService.getProductDetail(
    db,
    tenantId,
    productId
  );
  return c.json(result, 200);
});

inventory.post(
  "/category",
  verifyToken,
  validator("json", (value) => {
    const parsed = CreateNewCategorySchema.safeParse(value);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      throw new HttpError(422, "Validation failed", fieldErrors);
    }
    return parsed.data;
  }),
  async (c) => {
    const { tenantId } = c.get("user");
    const db = connectDB(c.env.DATABASE_URL);
    const payload = c.req.valid("json");
    const result = await InventoryService.createNewCategory(
      db,
      payload,
      tenantId
    );
    return c.json({ message: `${result!.category} has been added` }, 201);
  }
);

inventory.post(
  "/product",
  verifyToken,
  validator("json", (value) => {
    const parsed = CreateNewProductSchema.safeParse(value);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      throw new HttpError(422, "Validation failed", fieldErrors);
    }
    return parsed.data;
  }),
  async (c) => {
    const { tenantId } = c.get("user");
    const db = connectDB(c.env.DATABASE_URL);
    const payload = c.req.valid("json");
    const result = await InventoryService.createNewProducts(
      db,
      payload,
      tenantId
    );
    return c.json(result, 201);
  }
);

inventory.post(
  "/stock/:productId",
  verifyToken,
  verifyRole("OWNER", "ADMIN"),
  zValidator("json", AdjustStockSchema, (parsed) => {
    if (!parsed.success) {
      const flatten = z.flattenError(parsed.error);
      throw new HttpError(422, "Validation error", flatten.fieldErrors);
    }
  }),
  async (c) => {
    const user = c.get("user");
    const { username, tenantId } = user;
    const productId = c.req.param("productId");
    const db = connectDB(c.env.DATABASE_URL);
    const payload = c.req.valid("json");
    const result = await InventoryService.adjustStock(
      db,
      username,
      { id: productId, tenantId },
      payload
    );
    return c.json(result, 200);
  }
);

inventory.patch(
  "/:productId",
  verifyToken,
  validator("json", (value) => {
    const parsed = UpdateProductSchema.safeParse(value);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      throw new HttpError(422, "Validation failed", fieldErrors);
    }
    return parsed.data;
  }),
  async (c) => {
    const { tenantId } = c.get("user");
    const productId = c.req.param("productId");
    const db = connectDB(c.env.DATABASE_URL);
    const payload = c.req.valid("json");
    const result = await InventoryService.updateProduct(
      db,
      payload,
      tenantId,
      productId
    );
    return c.json(result, 200);
  }
);

export default inventory;
