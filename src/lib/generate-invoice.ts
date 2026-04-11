import { eq, and } from "drizzle-orm";
import type { DbClient } from "../db";
import { invoiceCounters } from "../db/schema/invoiceCounters";
import { tenants } from "../db/schema/tenants";

type TxClient = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

export async function generateInvoiceNumber(tx: TxClient, tenantId: string) {
  const currentYear = new Date().getFullYear();

  const tenant = await tx
    .select({ invoicePrefix: tenants.invoicePrefix })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const existingCounter = await tx
    .select()
    .from(invoiceCounters)
    .where(
      and(
        eq(invoiceCounters.tenantId, tenantId),
        eq(invoiceCounters.year, currentYear)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  let nextNumber: number;

  if (existingCounter) {
    nextNumber = existingCounter.lastNumber + 1;
    await tx
      .update(invoiceCounters)
      .set({ lastNumber: nextNumber })
      .where(eq(invoiceCounters.id, existingCounter.id));
  } else {
    nextNumber = 1;
    await tx.insert(invoiceCounters).values({
      year: currentYear,
      lastNumber: nextNumber,
      tenantId,
    });
  }

  const paddedNumber = String(nextNumber).padStart(4, "0");
  return `${tenant.invoicePrefix}-${currentYear}-${paddedNumber}`;
}
