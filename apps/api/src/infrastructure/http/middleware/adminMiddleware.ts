import type { Request, Response, NextFunction } from "express";
import type { SecurityLogger } from "../../logging/securityLogger.js";

export function createAdminMiddleware(logger?: SecurityLogger) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (res.locals.role !== "admin") {
      logger?.unauthorizedAccess(`admin:${_req.path}`);
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  };
}
