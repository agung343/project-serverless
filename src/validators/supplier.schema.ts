import { z} from "zod"

export const SupplierQuerySchema = z.object({
    name: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25)
})

export const SupplierHistoryQuerySchema = z.object({
    invoice: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
    startDate: z.string().optional(),
    endDate: z.string().optional()
})

export const CreateSupplierSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phone: z.string().trim().regex(/^\d+$/, "Phone must be contain only number").optional(),
    address: z.string().optional(),
    notes: z.string().optional()
})

export const UpdateSupplierSchema = z.object({
    name: z.string().min(1, "Name is required").optional(),
    phone: z.string().trim().regex(/^\d+$/, "Phone must be contain only number").optional(),
    address: z.string().optional(),
    notes: z.string().optional()
})

export type SupplierQuery = z.infer<typeof SupplierQuerySchema>
export type SupplierHistoryQuery = z.infer<typeof SupplierHistoryQuerySchema>
export type CreateSupplierPayload = z.infer<typeof CreateSupplierSchema>
export type UpdateSupplierPayload = z.infer<typeof UpdateSupplierSchema>
