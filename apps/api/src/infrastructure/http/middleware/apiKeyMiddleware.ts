import type { Request, Response, NextFunction } from "express";
import type { ApiKeyRepository } from "@semaforo/domain";
import { hashApiKey } from "../../crypto/hashApiKey.js";

function extractApiKey(req: Request): string | null {
  const header = req.headers["x-api-key"];
  if (typeof header === "string" && header) return header;
  return null;
}

export function createApiKeyMiddleware(apiKeyRepository: ApiKeyRepository) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const plaintext = extractApiKey(req);
    if (!plaintext) {
      res.status(401).json({ error: "API key required" });
      return;
    }

    const apiKey = await apiKeyRepository.findByKeyHash(hashApiKey(plaintext));
    if (!apiKey) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    res.locals.apiKeyEnvironmentId = apiKey.environmentId;
    next();
  };
}
