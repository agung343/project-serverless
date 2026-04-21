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

export const CreateExpensePurchaseSchema = z
  .object({
    invoiceNumber: z.string().min(1, "Invoice number is required"),
    date: z.string(),
    notes: z.string().optional(),
    supplierId: z.cuid2("Invalid supplier ID"),
    totalAmount: z.coerce
      .number("Must be a number")
      .nonnegative("Total amount must be a non-negative number"),
    paid: z.coerce
      .number("Must be a number")
      .nonnegative("Paid amount must be a non-negative number")
      .default(0),
    addToStock: z.preprocess((val) => val === "true" || val === true, z.boolean()).default(false),
    items: z.array(
      z.object({
        productId: z.cuid2().optional(),
        name: z.string().min(1, "Item name is required"),
        quantity: z.coerce
          .number("Must be a number")
          .positive("Quantity must be a positive number"),
        unitId: z.coerce
          .number("Must be a number")
          .int()
          .positive("Unit ID must be a positive integer"),
        unitCost: z.coerce
          .number("Must be a number")
          .nonnegative("Unit price must be a non-negative number"),
      })
    ),
  })
  .refine(
    (data) =>
      data.paid <=
      data.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
    {
      message: "Paid amount cannot exceed total amount calculated from items",
      path: ["paid"],
    }
  );

export const ArchievePurchaseSchema = z.object({
  notes: z.string().min(1, "Archieve noted is requierd")
})

export type ExpenseQuery = z.infer<typeof ExpenseQuerySchema>;
export type ExpenseOperationalPayload = z.infer<
  typeof CreateNewExpenseOperationalSchema
>;
export type UpdateExpenseOperationalPayload = z.infer<
  typeof UpdateExpenseOperationalSchema
>;
export type ExpensePurchasePayload = z.infer<
  typeof CreateExpensePurchaseSchema
>;
export type ArchievePurchasePayload = z.infer<typeof ArchievePurchaseSchema>
