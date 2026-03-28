import { eq, and, ne } from "drizzle-orm";
import { users, type User } from "../db/schema/users";
import { hashPassword } from "../lib/crypto";
import {
  UpdateUserPayload,
  CreateNewUserPayload,
} from "../validators/user.schema";
import { HttpError } from "../middlewares/HttpError";
import { type DbClient } from "../db";
import { DatabaseError } from "pg";

export class UsersService {
  static async getUsers(db: DbClient, tenantId: User["tenantId"]) {
    return await db.query.users.findMany({
      where: eq(users.tenantId, tenantId),
      columns: {
        id: true,
        username: true,
        role: true,
      },
    });
  }

  static async createUser(
    db: DbClient,
    payload: CreateNewUserPayload,
    tenantId: string
  ) {
    const hashPass = hashPassword(payload.password);

    try {
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
        role: newUser.role,
      };
    } catch (error) {
      if (error instanceof DatabaseError && error.code === "23505") {
        throw new HttpError(
          409,
          "Username already existed, please create unique one."
        );
      }
      throw error;
    }
  }

  static async editUser(
    db: DbClient,
    payload: UpdateUserPayload,
    userId: string,
    user: Pick<User, "id" | "role" | "tenantId">
  ) {
    const targetUser = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.tenantId, user.tenantId)),
    });
    if (!targetUser) throw new HttpError(404, "User not found");

    if (targetUser.role === "OWNER" && user.id !== userId) {
      throw new HttpError(403, "Forbidden: Can not edit the OWNER");
    }

    if (user.role === "ADMIN") {
      const isSelf = user.id === userId;

      if (!isSelf && targetUser.role !== "STAFF")
        throw new HttpError(
          403,
          "Forbidden: Admin can only edit staff and themselves."
        );
      if (payload.role && !isSelf)
        throw new HttpError(403, "Forbidden: Admin can not change users role.");
      if (isSelf && payload.role === "STAFF")
        throw new HttpError(
          403,
          "Forbidden: Admin can not downgrade their own role."
        );
    }

    const updatedData: Partial<typeof payload> = {
      ...payload,
    };

    if (updatedData.password) {
      updatedData.password = hashPassword(updatedData.password);
    }

    try {
      const [editUser] = await db
        .update(users)
        .set(updatedData)
        .where(and(eq(users.id, userId), eq(users.tenantId, user.tenantId)))
        .returning();

      if (!editUser) {
        throw new HttpError(404, "username not found");
      }

      return editUser;
    } catch (error) {
      if (error instanceof HttpError) throw error
      if (error instanceof DatabaseError && error.code === "23505") {
        throw new HttpError(409, "Username already existed, please create unique one.")
      }
    }
  }

  static async deleteUser(
    db: DbClient,
    userId: string,
    activeUser: Pick<User, "tenantId" | "role" | "id">
  ) {
    const targetUser = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.tenantId, activeUser.tenantId)),
    });
    if (!targetUser) throw new HttpError(404, "Username not existed");

    if (targetUser.role === "OWNER") {
      throw new HttpError(403, "Can not delete owner username");
    }

    if (activeUser.role === "ADMIN") {
      const isSelf = activeUser.id === userId;

      if (isSelf)
        throw new HttpError(403, "Forbidden: Can not delete own username.");
      if (targetUser.role !== "STAFF")
        throw new HttpError(403, "Forbidden: Admin can only delete staff.");
    }

    await db.delete(users).where(eq(users.id, targetUser.id));
  }
}
