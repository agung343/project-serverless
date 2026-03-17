export type JwtPayload = {
    tenantId: string,
    userId: string,
    username: string
    role: "OWNER" | "ADMIN" | "STAFF",
    exp: number
}

export type AppVariables = {
    user: JwtPayload
}
