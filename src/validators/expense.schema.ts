import { z } from "zod";

export const ExpenseOperationalQuerySchema = z.object({
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

export type ExpenseOperationalQuery = z.infer<typeof ExpenseOperationalQuerySchema>;
export type ExpenseOperationalPayload = z.infer<typeof CreateNewExpenseOperationalSchema>;
export type UpdateExpenseOperationalPayload = z.infer<typeof UpdateExpenseOperationalSchema>;
