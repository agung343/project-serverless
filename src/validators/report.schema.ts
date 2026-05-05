import { z } from "zod";

export const DashboardQuerySchema = z.object({
    range: z.enum(["7d", "30d", "90d", "1y"]).default("30d").optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
})

export const TransactionQuerySchema = z.object({
    range: z.enum(["7d", "30d", "90d", "1y"]).default("30d").optional(),
    product: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().max(100).default(25),
    startDate: z.string().optional(),
    endDate: z.string().optional()
})

export type DashboardQuery = z.infer<typeof DashboardQuerySchema>
export type TransactionQuery = z.infer<typeof TransactionQuerySchema>