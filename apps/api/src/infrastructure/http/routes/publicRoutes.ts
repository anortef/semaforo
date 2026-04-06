import { Router, type RequestHandler } from "express";
import type { GetPublicToggles } from "../../../application/GetPublicToggles.js";
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
  rateLimitReader?: RateLimitConfigReader
): Router {
  const router = Router();
  const dbLimiter = createCacheMissLimiter(rateLimitReader);

  if (environmentRepository && appRepository) {
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

        // Cache miss — apply strict rate limit before hitting DB
        dbLimiter(req, res, async () => {
          try {
            const env = await environmentRepository.findById(environmentId);
            if (!env) {
              res.status(404).json({ error: "Environment not found" });
              return;
            }

            const app = await appRepository.findById(env.appId);
            if (!app) {
              res.status(404).json({ error: "App not found" });
              return;
            }

            const toggles = await getPublicToggles.execute({
              appKey: app.key,
              envKey: env.key,
              toggleKey,
            });

            if (cache && !toggleKey) {
              await cache.setByApiKey(apiKeyValue, toggles, env.cacheTtlSeconds);
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
  }

  const handleFullPath = [
    (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
      const environmentId = res.locals.apiKeyEnvironmentId as string;
      if (environmentId) requestCounter?.increment(environmentId);
      dbLimiter(req, res, next);
    },
    async (req: import("express").Request, res: import("express").Response) => {
      try {
        const toggles = await getPublicToggles.execute({
          appKey: req.params.appKey,
          envKey: req.params.envKey,
          toggleKey: req.params.toggleKey,
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
  router.get("/apps/:appKey/environments/:envKey/toggles/:toggleKey", ...handleFullPath
  );

  return router;
}
