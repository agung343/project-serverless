import { z } from "zod";

export const registerTenantSchema = z.object({
    name: z.string().trim().min(2, "Company name at least has 2 characters"),
    email: z.email("Invalid email address"),
    phone: z.string().min(10),
    description: z.string().optional(),
    invoicePrefix: z.string().min(2).toUpperCase(),
    username: z.string().min(3, "Username at least has 3 characters"),
    password: z.string().trim().min(6, "Password at least has 6 characters long")
})

export const updateTenantSchema = registerTenantSchema.partial().omit({
    username: true,
    password: true
})

export type RegisterTenantDTO = z.infer<typeof registerTenantSchema>