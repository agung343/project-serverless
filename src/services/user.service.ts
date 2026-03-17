import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { users, type User } from "../db/schema/users";
import { tenants } from "../db/schema/tenants";
import { hashPassword, verifyPassword } from "../lib/crypto";
import { HttpError } from "../middlewares/HttpError";

export class AuthService {
  static async createUser(
    payload: Pick<User, "username" | "password" | "role">,
    tenantId: string
  ) {
    const existingUser = await db.query.users.findFirst({
      where: and(
        eq(users.username, payload.username),
        eq(users.tenantId, tenantId)
      ),
    });
    if (existingUser) {
      throw new HttpError(400, "username already exist, please try unique one");
    }

    const hashPass = hashPassword(payload.password);

    const [newUser] = await db
      .insert(users)
      .values({
        ...payload,
        password: hashPass,
        tenantId,
      })
      .returning();

    return {
      user: newUser.username,
    };
  }

  static async editUser(
    payload: Pick<User, "username" | "password" | "role">,
    tenantId: string,
    userId: string
  ) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, payload.username),
    });
    if (existingUser) {
      throw new HttpError(400, "username already exist, please try unique one");
    }

    const newHashPass = hashPassword(payload.password);

    const [editUser] = await db
      .update(users)
      .set({
        ...payload,
        password: newHashPass
      })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .returning();

    if (!editUser) {
      throw new HttpError(404, "username not found");
    }

    return editUser;
  }
}
