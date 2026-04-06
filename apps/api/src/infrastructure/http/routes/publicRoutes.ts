import { Router, type RequestHandler } from "express";
import type { GetPublicToggles } from "../../../application/GetPublicToggles.js";
import type { GetPublicValues } from "../../../application/GetPublicValues.js";
import type { GetPublicSecrets } from "../../../application/GetPublicSecrets.js";
import type { EnvironmentRepository, AppRepository } from "@semaforo/domain";
import type { ToggleCache, RequestCounter } from "../../cache/RedisToggleCache.js";
import { createCacheMissLimiter, type RateLimitConfigReader } from "../middleware/rateLimiter.js";

function extractApiKey(req: { headers: Record<string, unknown> }): string {
  const header = req.headers["x-api-key"];
  if (typeof header === "string" && header) return header;
  return "";
}

export function publicRoutes(
  getPublicToggles: GetPublicToggles,
  environmentRepository?: EnvironmentRepository,
  appRepository?: AppRepository,
  cache?: ToggleCache,
  requestCounter?: RequestCounter,
  rateLimitReader?: RateLimitConfigReader,
  getPublicSecrets?: GetPublicSecrets,
  getPublicValues?: GetPublicValues
): Router {
  const router = Router();
  const dbLimiter = createCacheMissLimiter(rateLimitReader);

  // Helper: resolve app + env from API key's environmentId
  async function resolveAppEnv(environmentId: string) {
    if (!environmentRepository || !appRepository) return null;
    const env = await environmentRepository.findById(environmentId);
    if (!env) return null;
    const app = await appRepository.findById(env.appId);
    if (!app) return null;
    return { app, env };
  }

  if (environmentRepository && appRepository) {
    // --- /toggles (boolean only, resolved via API key) ---
    const handleToggles = async (req: import("express").Request, res: import("express").Response) => {
      try {
        const apiKeyValue = extractApiKey(req);
        const environmentId = res.locals.apiKeyEnvironmentId as string;
        const toggleKey = req.params.toggleKey as string | undefined;

        requestCounter?.increment(environmentId);

        if (cache && !toggleKey) {
          const cached = await cache.getByApiKey(apiKeyValue);
          if (cached) {
            res.json(cached);
            return;
          }
        }

        if (cache && toggleKey) {
          const cached = await cache.getByApiKey(apiKeyValue);
          if (cached) {
            const value = toggleKey in cached ? cached[toggleKey] : false;
            res.json({ [toggleKey]: value });
            return;
          }
        }

        dbLimiter(req, res, async () => {
          try {
            const resolved = await resolveAppEnv(environmentId);
            if (!resolved) {
              res.status(404).json({ error: "Environment not found" });
              return;
            }

            const userId = typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : undefined;
            const toggles = await getPublicToggles.execute({
              appKey: resolved.app.key,
              envKey: resolved.env.key,
              toggleKey,
              userId,
            });

            if (cache && !toggleKey) {
              await cache.setByApiKey(apiKeyValue, toggles, resolved.env.cacheTtlSeconds);
            }

            res.json(toggles);
          } catch {
            res.status(500).json({ error: "Internal server error" });
          }
        });
      } catch {
        res.status(500).json({ error: "Internal server error" });
      }
    };

    router.get("/toggles", handleToggles);
    router.get("/toggles/:toggleKey", handleToggles);

    // --- /values (string values only, resolved via API key) ---
    const handleValues = async (req: import("express").Request, res: import("express").Response) => {
      try {
        const environmentId = res.locals.apiKeyEnvironmentId as string;
        const valueKey = req.params.valueKey as string | undefined;

        requestCounter?.increment(environmentId);

        dbLimiter(req, res, async () => {
          try {
            const resolved = await resolveAppEnv(environmentId);
            if (!resolved) {
              res.status(404).json({ error: "Environment not found" });
              return;
            }

            if (!getPublicValues) {
              res.status(404).json({ error: "Values endpoint not available" });
              return;
            }

            const values = await getPublicValues.execute({
              appKey: resolved.app.key,
              envKey: resolved.env.key,
              valueKey,
            });

            res.json(values);
          } catch {
            res.status(500).json({ error: "Internal server error" });
          }
        });
      } catch {
        res.status(500).json({ error: "Internal server error" });
      }
    };

    router.get("/values", handleValues);
    router.get("/values/:valueKey", handleValues);

    // --- /secrets (resolved via API key) ---
    if (getPublicSecrets) {
      const handleSecrets = async (req: import("express").Request, res: import("express").Response) => {
        try {
          const environmentId = res.locals.apiKeyEnvironmentId as string;

          requestCounter?.increment(environmentId);

          dbLimiter(req, res, async () => {
            try {
              const resolved = await resolveAppEnv(environmentId);
              if (!resolved) {
                res.status(404).json({ error: "Environment not found" });
                return;
              }

              const secrets = await getPublicSecrets.execute({
                appKey: resolved.app.key,
                envKey: resolved.env.key,
              });

              res.json(secrets);
            } catch {
              res.status(500).json({ error: "Internal server error" });
            }
          });
        } catch {
          res.status(500).json({ error: "Internal server error" });
        }
      };

      router.get("/secrets", handleSecrets);
    }
  }

  // --- Full-path routes (kept for backwards compatibility) ---
  const handleFullPath = [
    (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
      const environmentId = res.locals.apiKeyEnvironmentId as string;
      if (environmentId) requestCounter?.increment(environmentId);
      dbLimiter(req, res, next);
    },
    async (req: import("express").Request, res: import("express").Response) => {
      try {
        const userId = typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : undefined;
        const toggles = await getPublicToggles.execute({
          appKey: req.params.appKey,
          envKey: req.params.envKey,
          toggleKey: req.params.toggleKey,
          userId,
        });
        res.json(toggles);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Internal server error";
        if (message.includes("not found")) {
          res.status(404).json({ error: message });
        } else {
          res.status(500).json({ error: "Internal server error" });
        }
      }
    },
  ] as import("express").RequestHandler[];

  router.get("/apps/:appKey/environments/:envKey/toggles", ...handleFullPath);
  router.get("/apps/:appKey/environments/:envKey/toggles/:toggleKey", ...handleFullPath);

  if (getPublicSecrets) {
    const handleFullPathSecrets = [
      (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
        const environmentId = res.locals.apiKeyEnvironmentId as string;
        if (environmentId) requestCounter?.increment(environmentId);
        dbLimiter(req, res, next);
      },
      async (req: import("express").Request, res: import("express").Response) => {
        try {
          const secrets = await getPublicSecrets.execute({
            appKey: req.params.appKey,
            envKey: req.params.envKey,
          });
          res.json(secrets);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Internal server error";
          if (message.includes("not found")) {
            res.status(404).json({ error: message });
          } else {
            res.status(500).json({ error: "Internal server error" });
          }
        }
      },
    ] as import("express").RequestHandler[];

    router.get("/apps/:appKey/environments/:envKey/secrets", ...handleFullPathSecrets);
  }

  return router;
}
