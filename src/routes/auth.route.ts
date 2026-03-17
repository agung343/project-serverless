import { createApp } from "../lib/createApp";
import { validator } from "hono/validator";
import { verifyToken } from "../middlewares/verifyToken";
import { verifyRole } from "../middlewares/verifyRole";
import { AuthService } from "../services/auth.service";
import { LoginSchema } from "../validators";
import { HttpError } from "../middlewares/HttpError";
import { setCookie, deleteCookie } from "hono/cookie";

const auth = createApp();

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
    try {
      const body = c.req.valid("json");

      const result = await AuthService.login(
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
        sameSite: isProd ? "Strict" : "Lax",
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

export default auth;
