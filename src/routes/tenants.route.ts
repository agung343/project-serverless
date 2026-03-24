import { createApp } from "../lib/createApp";
import { validator } from "hono/validator";
import { TenantService } from "../services/tenant.service";
import { HttpError } from "../middlewares/HttpError";
import { registerTenantSchema } from "../validators/index";
import { connectDB } from "../db";

const tenants = createApp();

tenants.post(
  "/register",
  validator("json", (value) => {
    const parsed = registerTenantSchema.safeParse(value);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      throw new HttpError(400, "Invalid Form", fieldErrors);
    }
    return parsed.data;
  }),
  async (c) => {
    const db = connectDB(c.env.DATABASE_URL);
    try {
      const body = c.req.valid("json");

      const result = await TenantService.registerTenantAndOwner(db, {
        tenant: {
          name: body.name,
          email: body.email,
          phone: body.phone,
          description: body.description,
          invoicePrefix: body.invoicePrefix,
        },
        owner: {
          username: body.username,
          password: body.password,
        },
      });

      return c.json(
        {
          success: true,
          message: "Tenant and Owner accounts created",
          result,
        },
        201
      );
    } catch (error: any) {
      if (error instanceof HttpError) {
        throw error;
      }

      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new HttpError(
          409,
          "A tenant with its name or email already exist"
        );
      }

      throw new HttpError(500, "Something went wrong", {
        error: error.message,
      });
    }
  }
);

export default tenants;
