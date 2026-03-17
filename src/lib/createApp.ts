import { Hono } from "hono";
import type { AppVariables } from "../types/auth.types";

export const createApp = () => new Hono<{ Bindings: CloudflareBindings, Variables: AppVariables }>();
