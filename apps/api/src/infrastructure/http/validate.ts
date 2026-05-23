import type { Request, Response, NextFunction } from "express";
import { z, type ZodTypeAny } from "zod";

// Validates `req.body` against a Zod schema. On success, replaces
// `req.body` with the parsed value so downstream handlers see the
// type-checked shape. On failure, responds with 400 and a short
// error message; never leaks the schema internals.
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const path = first?.path.join(".") || "body";
      res.status(400).json({ error: `Invalid request: ${path} ${first?.message ?? "is invalid"}` });
      return;
    }
    req.body = parsed.data;
    next();
  };
}

// Standard schema fragments reused across routes.
export const schemas = {
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  appKey: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "must be lowercase alphanumeric with hyphens"),
  envKey: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "must be lowercase alphanumeric with hyphens"),
  camelCaseKey: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/, "must be camelCase alphanumeric"),
  userRole: z.enum(["admin", "user"]),
  toggleType: z.enum(["boolean", "string"]),
  appMemberRole: z.enum(["owner", "editor", "viewer"]),
  cacheTtlSeconds: z.number().int().min(0).max(86400),
  rolloutPercentage: z.number().int().min(0).max(100),
};
