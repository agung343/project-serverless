import { z } from "zod"

export const LoginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required")
})

export const updateSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    role: z.enum({
        
    })
})

export type LoginDTO = z.infer<typeof LoginSchema>