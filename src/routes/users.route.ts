import { createApp } from "../lib/createApp";

const users = createApp()

users.get("/", (c) => {
    return c.json({
        id: "1",
        user: "Agung"
    })
})

export default users