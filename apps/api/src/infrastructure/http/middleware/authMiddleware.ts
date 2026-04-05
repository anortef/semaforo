import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

function extractToken(header: string | undefined): string | null {
  if (!header) return null;
  const parts = header.split(" ");
  if (parts[0] !== "Bearer" || !parts[1]) return null;
  return parts[1];
}

export function createAuthMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const payload = jwt.verify(token, secret) as TokenPayload;
      res.locals.userId = payload.userId;
      res.locals.email = payload.email;
      res.locals.role = payload.role;
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}
