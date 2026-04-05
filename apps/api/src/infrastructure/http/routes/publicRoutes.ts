import { Router, type RequestHandler } from "express";
import type { GetPublicToggles } from "../../../application/GetPublicToggles.js";
import type { EnvironmentRepository, AppRepository } from "@semaforo/domain";
import type { ToggleCache, RequestCounter } from "../../cache/RedisToggleCache.js";
import { createCacheMissLimiter } from "../middleware/rateLimiter.js";

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
  requestCounter?: RequestCounter
): Router {
  const router = Router();
  const dbLimiter = createCacheMissLimiter();

  if (environmentRepository && appRepository) {
    router.get("/toggles", async (req, res) => {
      try {
        const apiKeyValue = extractApiKey(req);
        const environmentId = res.locals.apiKeyEnvironmentId as string;

        requestCounter?.increment(environmentId);

        if (cache) {
          const cached = await cache.getByApiKey(apiKeyValue);
          if (cached) {
            res.json(cached);
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
            });

            if (cache) {
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
    });
  }

  router.get(
    "/apps/:appKey/environments/:envKey/toggles",
    (req, res, next) => {
      const environmentId = res.locals.apiKeyEnvironmentId as string;
      if (environmentId) requestCounter?.increment(environmentId);

      // This endpoint always hits GetPublicToggles (which has its own cache),
      // so apply the DB-protection limiter
      dbLimiter(req, res, next);
    },
    async (req, res) => {
      try {
        const toggles = await getPublicToggles.execute({
          appKey: req.params.appKey,
          envKey: req.params.envKey,
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
    }
  );

  return router;
}
