import type { Request, Response, NextFunction } from "express";
import type { ApiKeyRepository } from "@semaforo/domain";

function extractApiKey(req: Request): string | null {
  const header = req.headers["x-api-key"];
  if (typeof header === "string" && header) return header;
  return null;
}

export function createApiKeyMiddleware(apiKeyRepository: ApiKeyRepository) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = extractApiKey(req);
    if (!key) {
      res.status(401).json({ error: "API key required" });
      return;
    }

    const apiKey = await apiKeyRepository.findByKey(key);
    if (!apiKey) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    res.locals.apiKeyEnvironmentId = apiKey.environmentId;
    next();
  };
}
