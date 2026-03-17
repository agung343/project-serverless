import { createMiddleware } from "hono/factory";
import { HttpError } from "./HttpError";

export const verifyRole = (...roles: string[]) => createMiddleware(async (c, next) => {
    const user = c.get("user")

    if (!roles.includes(user.role)) {
        throw new HttpError(403, "Forbidden: insufficient role")
    }

    await next()
})