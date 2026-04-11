import { z } from "zod";

export const OrderQuerySchema = z.object({
  invoice: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const CreateOrderSchema = z
  .object({
    paid: z.coerce.number().positive(),
    notes: z.string().optional(),
    paymentType: z.enum(["cash", "qris", "card", "e-money"]),
    cardLastFour: z.string().length(4).optional(),
    cardReference: z.string().optional(),
    emoneyPlatform: z
      .enum(["Flazz", "E-Money Mandiri", "Brizzi", "Tapcash"])
      .optional(),
    items: z.array(
      z.object({
        productId: z.cuid2(),
        quantity: z.coerce.number().positive("Must be positive number"),
        unitPrice: z.coerce.number().min(0, "Must be positive number"),
      })
    ),
  })
  .refine(
    (data) => {
      if (data.paymentType === "card") {
        return !!data.cardLastFour && !!data.cardReference;
      }
      return true;
    },
    {
      message: "Card last 4 digits and reference number are required",
      path: ["cardLastFour"],
    }
  )
  .refine(
    (data) => {
      if (data.paymentType === "e-money") {
        return !!data.emoneyPlatform;
      }
      return true;
    },
    { message: "Please select an e-money platform", path: ["emoneyPlatform"] }
  );

export const EditOrderSchema = z
  .object({
    paid: z.coerce.number().positive(),
    notes: z.string().min(1, "Note is required"),
    paymentType: z.enum(["cash", "qris", "card", "e-money"]),
    cardLastFour: z.string().length(4).optional(),
    cardReference: z.string().optional(),
    emoneyPlatform: z
      .enum(["Flazz", "E-Money Mandiri", "Brizzi", "Tapcash"])
      .optional(),
    items: z.array(
      z.object({
        productId: z.cuid2(),
        quantity: z.coerce.number().positive("Must be positive number"),
        unitPrice: z.coerce.number().min(0, "Must be positive number"),
      })
    ),
  })
  .refine(
    (data) => {
      if (data.paymentType === "card") {
        return !!data.cardLastFour && !!data.cardReference;
      }
      return true;
    },
    {
      message: "Card last 4 digits and reference number are required",
      path: ["cardLastFour"],
    }
  )
  .refine(
    (data) => {
      if (data.paymentType === "e-money") {
        return !!data.emoneyPlatform;
      }
      return true;
    },
    { message: "Please select an e-money platform", path: ["emoneyPlatform"] }
  );

export const DeleteOrderSchema = z.object({
  notes: z.string().min(1, "note is required")
})

export type OrderQuery = z.infer<typeof OrderQuerySchema>;
export type CreateOrderPayload = z.infer<typeof CreateOrderSchema>;
export type EditeOrderPayload = z.infer<typeof EditOrderSchema>
export type DeleteOrderPayload = z.infer<typeof DeleteOrderPayload>
