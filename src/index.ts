import dotenv from "dotenv"
import { Hono } from "hono";
import { cors } from "hono/cors"
import { HttpError } from "./middlewares/HttpError";

import tenants from "./routes/tenants.route"
import auth from "./routes/auth.route";
import users from "./routes/users.route";
import inventory from "./routes/inventory.route"

dotenv.config()
const app = new Hono<{Bindings: CloudflareBindings}>()

app.use("*", cors({
  origin: "http://localhost:3000",
  
  credentials: true
}))

app.get("/", (c) => {
  return c.json({message: "Hello Hono"})
})

app.get("/message", (c) => {
  return c.text("Hello Hono!");
});

app.route("/tenants", tenants)
app.route("/auth", auth)
app.route("/users", users)
app.route("/inventory", inventory)

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json(
      {message: err.message,
        details: err.details
      },
      err.statusCode
    )
  }
  console.error(err)
  return c.json({message: "Internal Server Error"}, 500)
})

export default app;
