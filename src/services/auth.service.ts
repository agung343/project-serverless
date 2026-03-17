import { eq, and} from "drizzle-orm";
import { sign } from "hono/jwt";
import { db } from "../db";
import { users, type User } from "../db/schema/users";
import { tenants } from "../db/schema/tenants";
import { verifyPassword } from "../lib/crypto";
import { HttpError } from "../middlewares/HttpError";

export class AuthService {
  static async login(
    payload: Pick<User, "username" | "password">,
    tenant: string
  ) {
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(tenants.name, tenant),
    });
    if (!existingTenant) {
      throw new HttpError(404, "Tenant not found");
    }

    const user = await db.query.users.findFirst({
      where: and(
        eq(users.username, payload.username),
        eq(users.tenantId, existingTenant.id)
      ),
    });
    if (!user) {
      throw new HttpError(401, "Username or Password are incorrect");
    }
    const verified = verifyPassword(payload.password, user.password);
    if (!verified) {
      throw new HttpError(401, "Username or Password are incorrect");
    }

    const token = await sign(
      {
        tenantId: user.tenantId,
        userId: user.id,
        username: user.username,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      process.env.JWT_SECRET as string
    );

    return { token, user };
  }
}
