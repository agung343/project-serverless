import { z } from "zod";

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
  productId: z.cuid2(),
  quantity: z.coerce.number().min(0, "Stock can not be negative"),
  note: z.string().min(1, "Note are required"),
  checkBy: z.string().min(1, "user unauthorized")
})

export type CategoryPayload = z.infer<typeof CreateNewCategorySchema>
export type ProductPayload = z.infer<typeof CreateNewProductSchema>
export type UpdateProductPayload = z.infer<typeof UpdateProductSchema>
export type AdjustStockPayload = z.infer<typeof AdjustStockSchema>