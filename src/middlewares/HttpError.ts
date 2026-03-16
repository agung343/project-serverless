import { ContentfulStatusCode} from "hono/utils/http-status"

export class HttpError extends Error {
    statusCode: ContentfulStatusCode
    details: unknown

    constructor(statusCode: ContentfulStatusCode, message: string, details?: unknown) {
        super(message)
        this.statusCode = statusCode
        this.details = details

        Object.setPrototypeOf(this, HttpError.prototype)
    }
}