import { verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { HttpError } from "./HttpError";
import type { JwtPayload } from "../types/auth.types";

export const verifyToken = createMiddleware(async (c, next) => {
    const token = getCookie(c, "token")
    if (!token) {
        throw new HttpError(401, "Unauthorized")
    }

    try {
        const payload = await verify(token, process.env.JWT_SECRET as string, "HS256") as JwtPayload

        c.set("user", {
            tenantId: payload.tenantId,
            userId: payload.userId,
            username: payload.username,
            role: payload.role
        })

        await next()
    } catch (error) {
        throw new HttpError(401, "Invalid or expired token")
    }
})