import { z } from "zod";

export const ExpenseQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const CreateNewExpenseOperationalSchema = z.object({
  name: z.string().min(2, "Expense name at least has 2 characters"),
  amount: z.coerce.number().positive("Amount must be a positive number"),
  description: z.string().optional(),
});

export const UpdateExpenseOperationalSchema = z.object({
  name: z.string().min(2, "Expense name at least has 2 characters").optional(),
  amount: z.coerce
    .number()
    .positive("Amount must be a positive number")
    .optional(),
  description: z.string().optional(),
});

export const CreateNewExpensePurchaseSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice is required"),
  date: z.string().min(1, "Date is required"),
  paid: z.coerce.number().nonnegative("Can not a negative number"),
  status: z.enum(["DRAFT", "PARTIALLY_PAID", "PAID"]),
  notes: z.string().optional(),
  supplierId: z.cuid2(),
  tenantId: z.cuid2(),
  items: z
    .array(
      z
        .object({
          purchaseId: z.cuid2(),
          name: z.string().optional(),
          productId: z.cuid2().optional(),
          quantity: z.coerce.number().positive("Must be a positive number"),
          unitId: z.string(),
          unitPrice: z.coerce.number().positive("Must be a positive number"),
        })
        .refine(
          (item) => item.productId !== undefined || item.name !== undefined,
          { message: "Either select from catalog or name must be provided" }
        )
    )
    .min(1, "At least 1 item"),
});

export type ExpenseQuery = z.infer<typeof ExpenseQuerySchema>;
export type ExpenseOperationalPayload = z.infer<
  typeof CreateNewExpenseOperationalSchema
>;
export type UpdateExpenseOperationalPayload = z.infer<
  typeof UpdateExpenseOperationalSchema
>;
export type ExpensePurchasePayload = z.infer<
  typeof CreateNewExpensePurchaseSchema
>;
