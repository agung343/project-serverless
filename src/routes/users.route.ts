import { createApp } from "../lib/createApp";
import { validator } from "hono/validator";
import { verifyToken } from "../middlewares/verifyToken";
import { verifyRole } from "../middlewares/verifyRole";
import { UsersService } from "../services/user.service";
import { CreateUserSchema, UpdateUserSchema } from "../validators/user.schema";
import { HttpError } from "../middlewares/HttpError";
import { connectDB } from "../db";

const users = createApp();

users.get("/", verifyToken, async (c) => {
  const db = connectDB(c.env.DATABASE_URL);
  const tenantId = c.get("user").tenantId;
  const users = await UsersService.getUsers(db, tenantId);

  return c.json({
    users,
  });
});

users.post(
  "/",
  verifyToken,
  verifyRole("OWNER", "ADMIN"),
  validator("json", (value) => {
    const parsed = CreateUserSchema.safeParse(value);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      throw new HttpError(422, "Invalid Form Request", fieldErrors);
    }
    return parsed.data;
  }),
  async (c) => {
    const tenantId = c.get("user").tenantId;
    const db = connectDB(c.env.DATABASE_URL);
    const body = c.req.valid("json");

    const result = await UsersService.createUser(
      db,
      {
        username: body.username,
        password: body.password,
        role: body.role,
      },
      tenantId
    );

    return c.json(
      {
        message: `New username has been added: ${result.user} - ${result.role}`,
      },
      201
    );
  }
);

users.put(
  "/:userId",
  verifyToken,
  verifyRole("OWNER", "ADMIN"),
  validator("json", (value) => {
    const parsed = UpdateUserSchema.safeParse(value);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      throw new HttpError(400, "Invalid Form Request", fieldErrors);
    }
    return parsed.data;
  }),
  async (c) => {
    const db = connectDB(c.env.DATABASE_URL);
    const user = c.get("user");
    const userId = c.req.param("userId");
    const body = c.req.valid("json");

    await UsersService.editUser(db, body, userId, {
      id: user.userId,
      tenantId: user.tenantId,
      role: user.role,
    });

    return c.json(
      {
        message: `Username has been updated`,
      },
      201
    );
  }
);

users.delete(
  "/:userId",
  verifyToken,
  verifyRole("OWNER", "ADMIN"),
  async (c) => {
    const db = connectDB(c.env.DATABASE_URL);
    const user = c.get("user");
    const userId = c.req.param("userId");

    await UsersService.deleteUser(db, userId, {
      id: user.userId,
      tenantId: user.tenantId,
      role: user.role,
    });

    return c.body(null, 204)
  }
);

export default users;
