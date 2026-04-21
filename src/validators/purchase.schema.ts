import { z } from "zod"

export const CreatePurchaseQuerySchema = z.object({
    product: z.string().optional(),
    supplier: z.string().optional()
})

export const PurchaseQuerySchema = z.object({
    invoice: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().max(100).default(25),
    startDate: z.string().optional(),
    endDate: z.string().optional()
})

export type CreatePurchaseQuery = z.infer<typeof CreatePurchaseQuerySchema>
export type PurchaseQuery = z.infer<typeof PurchaseQuerySchema>
