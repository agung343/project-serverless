import dotenv from "dotenv"
import { Hono } from "hono";
import { cors } from "hono/cors"
import { HttpError } from "./middlewares/HttpError";

import tenants from "./routes/tenants.route"
import auth from "./routes/auth.route";
import users from "./routes/users.route";
import inventory from "./routes/inventory.route"
import expense from "./routes/expenses.route";
import orders from "./routes/order.route"
import sales from "./routes/sales.route"
import purchases from "./routes/purchases.route"
import supplier from "./routes/supplier.route"
import report from "./routes/report.route"

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
app.route("/expenses", expense)
app.route("/orders", orders)
app.route("/sales", sales)
app.route("/purchases", purchases)
app.route("/supplier", supplier)
app.route("/report", report)

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
