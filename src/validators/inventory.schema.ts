import { z } from "zod";

export const ProductQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  startDate: z.string().optional(),
  endDate: z.string().optional()
})

export const CreateNewCategorySchema = z.object({
  name: z.string().min(1, "Category at least has 1 character"),
});

export const CreateNewProductSchema = z.object({
  name: z.string().min(2, "Product name at least has 2 characters"),
  code: z
    .string()
    .min(2, "Product code at least has 2 characters")
    .toUpperCase(),
  price: z.number().min(0),
  cost: z.number().min(0),
  unitId: z.number().int().optional(),
  description: z.string().optional(),
  categoryId: z.cuid2(),
});

export const UpdateProductSchema = z.object({
  name: z.string().min(2, "Product name at least has 2 characters").optional(),
  code: z
    .string()
    .min(2, "Product code at least has 2 characters")
    .toUpperCase()
    .optional(),
  price: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  description: z.string().optional(),
  categoryId: z.cuid2(),
});

export const AdjustStockSchema = z.object({
  quantity: z.coerce.number().min(0, "Must be a positive number"),
  note: z.string().min(1, "Adjust note is required")
})

export type ProductQuery = z.infer<typeof ProductQuerySchema>
export type CategoryPayload = z.infer<typeof CreateNewCategorySchema>
export type ProductPayload = z.infer<typeof CreateNewProductSchema>
export type UpdateProductPayload = z.infer<typeof UpdateProductSchema>
export type AdjustStockPayload = z.infer<typeof AdjustStockSchema>