import { eq } from "drizzle-orm";
import { db } from "../db";
import { tenants, type NewTenant } from "../db/schema/tenants";
import { users, type NewUser } from "../db/schema/users";
import { hashPassword } from "../lib/crypto";
import { HttpError } from "../middlewares/HttpError";

export class TenantService {
  static async registerTenantAndOwner(input: {
    tenant: Omit<NewTenant, "id" | "createdAt" | "updatedAt">;
    owner: Pick<NewUser, "username" | "password">;
  }) {
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(tenants.email, input.tenant.email),
    });
    if (existingTenant) {
      throw new HttpError(409, "Email already in used");
    }

    return await db.transaction(async (tx) => {
      const [newTenant] = await tx
        .insert(tenants)
        .values({
          ...input.tenant,
          invoicePrefix: input.tenant.invoicePrefix.toUpperCase(),
        })
        .returning();

      const hashPass = hashPassword(input.owner.password);

      const [owner] = await tx
        .insert(users)
        .values({
          username: input.owner.username,
          password: hashPass,
          role: "OWNER",
          tenantId: newTenant.id,
        })
        .returning();

      return {
        tenantId: newTenant.id,
        owner: owner.username,
      };
    });
  }
}
