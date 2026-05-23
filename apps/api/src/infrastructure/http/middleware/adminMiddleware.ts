import type { Request, Response, NextFunction } from "express";
import type { UserRepository } from "@semaforo/domain";
import type { SecurityLogger } from "../../logging/securityLogger.js";

// Re-fetches the user from the repository on every admin request so role
// revocations (and account disables) take effect immediately, rather than
// remaining stuck on whatever the JWT carried at issuance time.
export function createAdminMiddleware(
  userRepository: UserRepository,
  logger?: SecurityLogger,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = res.locals.userId;
    if (typeof userId !== "string") {
      logger?.unauthorizedAccess(`admin:${req.path}`);
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const user = await userRepository.findById(userId);
    if (!user || user.disabled || user.role !== "admin") {
      logger?.unauthorizedAccess(`admin:${req.path}`);
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    res.locals.role = user.role;
    next();
  };
}
