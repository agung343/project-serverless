import { createApp } from "../lib/createApp";
import { validator } from "hono/validator";
import { verifyToken } from "../middlewares/verifyToken";
import { AuthService } from "../services/auth.service";
import { LoginSchema } from "../validators/auth.schema";
import { HttpError } from "../middlewares/HttpError";
import { setCookie, deleteCookie } from "hono/cookie";
import { connectDB } from "../db";

const auth = createApp();

auth.get("/me", verifyToken, async (c) => {
  try {
    const user = c.get("user");

    return c.json(
      {
        user: {
          tenandId: user.tenantId,
          userId: user.userId,
          username: user.username,
          role: user.role,
        },
      },
      200
    );
  } catch (error: any) {
    if (error instanceof HttpError) throw error;

    throw new HttpError(500, "Something went wrong", { error: error.message });
  }
});

auth.get("/:tenant", async (c) => {
  const tenant = c.req.param("tenant");
  const db = connectDB(c.env.DATABASE_URL);
  try {
    await AuthService.tenant(db, tenant);

    return c.json(
      {
        existed: true,
      },
      200
    );
  } catch (error: any) {
    if (error instanceof HttpError) throw error;

    throw new HttpError(500, "Something went wrong", { error: error.message });
  }
});

auth.post("/logout", async (c) => {
  deleteCookie(c, "token");

  return c.json(
    {
      message: "Logged out",
    },
    200
  );
});

auth.post(
  "/login/:tenant",
  validator("json", (value) => {
    const parsed = LoginSchema.safeParse(value);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      throw new HttpError(400, "Invalid Form", fieldErrors);
    }
    return parsed.data;
  }),
  async (c) => {
    const tenant = c.req.param("tenant");
    const db = connectDB(c.env.DATABASE_URL);
    try {
      const body = c.req.valid("json");

      const result = await AuthService.login(
        db,
        {
          username: body.username,
          password: body.password,
        },
        tenant
      );

      const isProd = process.env.NODE_ENV === "production";

      setCookie(c, "token", result.token, {
        httpOnly: true,
        secure: isProd ? true : false,
        sameSite: isProd ? "None" : "Lax",
        maxAge: 60 * 60,
      });

      return c.json({ success: true, user: result.user.username }, 200);
    } catch (error: any) {
      if (error instanceof HttpError) throw error;

      throw new HttpError(500, "Something went wrong", {
        error: error.message,
      });
    }
  }
);

export default auth;
