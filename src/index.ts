import { Hono } from "hono";
import { cors } from "hono/cors"
import { HttpError } from "./middlewares/HttpError";
import users from "./routes/users.route";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use("*", cors())

app.get("/", (c) => {
  return c.json({message: "Hello Hono"})
})

app.get("/message", (c) => {
  return c.text("Hello Hono!");
});

app.route("/users", users)

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json(
      {message: err.message},
      err.statusCode
    )
  }

  return c.json({message: "Internal Server Error"}, 500)
})

export default app;
