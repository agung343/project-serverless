import { z } from "zod";

export const CreateUserSchema = z.object({
  username: z.string().min(2, "Username at least has 2 characters long"),
  password: z.string().min(6, "password at least 6 characters long"),
  role: z.enum(["ADMIN", "STAFF"]),
});

export const UpdateUserSchema = z
  .object({
    username: z
      .string()
      .min(2, "Username at least has 2 characters long")
      .optional(),
    password: z
      .string()
      .min(6, "password at least 6 characters long")
      .optional(),
    role: z.enum(["ADMIN", "STAFF"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one must be provided",
  });


export type CreateNewUserPayload = z.infer<typeof CreateUserSchema>
export type UpdateUserPayload = z.infer<typeof UpdateUserSchema>