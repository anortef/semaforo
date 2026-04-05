import { Router } from "express";
import jwt from "jsonwebtoken";
import type { Login } from "../../../application/Login.js";
import { createAuthMiddleware } from "../middleware/authMiddleware.js";
import type { SecurityLogger } from "../../logging/securityLogger.js";

export function authRoutes(login: Login, jwtSecret: string, logger?: SecurityLogger): Router {
  const router = Router();
  const auth = createAuthMiddleware(jwtSecret);

  router.post("/login", async (req, res) => {
    try {
      const result = await login.execute({
        email: req.body.email,
        password: req.body.password,
      });
      const decoded = jwt.decode(result.token) as { userId: string } | null;
      logger?.loginSuccess(decoded?.userId ?? "unknown", req.body.email);
      res.json(result);
    } catch {
      logger?.loginFailure(req.body.email ?? "unknown");
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  router.get("/me", auth, (_req, res) => {
    res.json({
      userId: res.locals.userId,
      email: res.locals.email,
      role: res.locals.role,
    });
  });

  return router;
}
