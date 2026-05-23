import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
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

// Resolves the calling end-user identity from the `x-user-id` header.
//
// The header value is required to be a JWT signed with the SDK secret and
// containing a `userId` claim. Returns the verified userId on success.
// Returns `{ rejected: true }` when the header is present but the token
// cannot be verified — the caller should respond 401 in that case rather
// than silently fall back to random rollout (which would let an attacker
// dodge sticky bucketing by sending nonsense in the header).
// Returns `{ userId: undefined }` when the header is absent (anonymous).
type IdentityResult =
  | { userId: string | undefined; rejected?: undefined }
  | { rejected: true };

function resolveUserIdentity(req: Request, sdkJwtSecret: string): IdentityResult {
  const header = req.headers["x-user-id"];
  if (header === undefined || header === "") {
    return { userId: undefined };
  }
  if (typeof header !== "string") {
    return { rejected: true };
  }
  try {
    const payload = jwt.verify(header, sdkJwtSecret, {
      algorithms: ["HS256"],
    });
    if (typeof payload === "object" && payload !== null) {
      const claim = (payload as Record<string, unknown>).userId;
      if (typeof claim === "string" && claim.length > 0) {
        return { userId: claim };
      }
    }
    return { rejected: true };
  } catch {
    return { rejected: true };
  }
}

export function publicRoutes(
  getPublicToggles: GetPublicToggles,
  sdkJwtSecret: string,
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

            const identity = resolveUserIdentity(req, sdkJwtSecret);
            if (identity.rejected) {
              res.status(401).json({ error: "Invalid x-user-id token" });
              return;
            }
            const toggles = await getPublicToggles.execute({
              appKey: resolved.app.key,
              envKey: resolved.env.key,
              toggleKey,
              userId: identity.userId,
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
        const identity = resolveUserIdentity(req, sdkJwtSecret);
        if (identity.rejected) {
          res.status(401).json({ error: "Invalid x-user-id token" });
          return;
        }
        const toggles = await getPublicToggles.execute({
          appKey: req.params.appKey,
          envKey: req.params.envKey,
          toggleKey: req.params.toggleKey,
          userId: identity.userId,
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
