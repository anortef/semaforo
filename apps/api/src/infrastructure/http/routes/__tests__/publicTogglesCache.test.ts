import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import type { ToggleCache } from "../../../cache/RedisToggleCache.js";
import type { GetPublicToggles } from "../../../../application/GetPublicToggles.js";
import type { EnvironmentRepository, AppRepository } from "@semaforo/domain";
import { publicRoutes } from "../publicRoutes.js";

function createSpyCache(): ToggleCache & { calls: Record<string, unknown[][]> } {
  const store = new Map<string, string>();
  const calls: Record<string, unknown[][]> = { getByApiKey: [], setByApiKey: [] };

  return {
    calls,
    async get() { return null; },
    async set() {},
    async invalidate() {},
    async getByApiKey(apiKey: string) {
      calls.getByApiKey.push([apiKey]);
      const data = store.get(`apikey:${apiKey}`);
      return data ? JSON.parse(data) : null;
    },
    async setByApiKey(apiKey: string, toggles: Record<string, boolean>, ttl: number) {
      calls.setByApiKey.push([apiKey, toggles, ttl]);
      store.set(`apikey:${apiKey}`, JSON.stringify(toggles));
    },
  };
}

function buildApp(
  cache: ToggleCache,
  toggleResult: Record<string, boolean>,
  envCacheTtl: number
) {
  const getPublicToggles = {
    execute: vi.fn().mockResolvedValue(toggleResult),
  } as unknown as GetPublicToggles;

  const environmentRepository = {
    findById: vi.fn().mockResolvedValue({
      id: { value: "env-1" },
      appId: "app-1",
      key: "prod",
      name: "Production",
      cacheTtlSeconds: envCacheTtl,
      createdAt: new Date(),
    }),
  } as unknown as EnvironmentRepository;

  const appRepository = {
    findById: vi.fn().mockResolvedValue({
      id: { value: "app-1" },
      key: "shop",
      name: "Shop",
      description: "",
      createdAt: new Date(),
    }),
  } as unknown as AppRepository;

  const app = express();
  // Simulate apiKeyMiddleware having set locals
  app.use((req, res, next) => {
    const apiKey = req.headers["x-api-key"] as string;
    if (apiKey) {
      res.locals.apiKeyEnvironmentId = "env-1";
      res.locals.apiKeyValue = apiKey;
    }
    next();
  });
  app.use(publicRoutes(getPublicToggles, environmentRepository, appRepository, cache));

  return { app, getPublicToggles };
}

describe("GET /toggles — API key caching", () => {
  it("caches the result by API key with env TTL", async () => {
    const cache = createSpyCache();
    const { app } = buildApp(cache, { featureA: true }, 300);

    await request(app).get("/toggles").set("x-api-key", "sk_test123");

    expect(cache.calls.setByApiKey[0]).toEqual(["sk_test123", { featureA: true }, 300]);
  });

  it("returns cached result without calling GetPublicToggles", async () => {
    const cache = createSpyCache();
    const { app, getPublicToggles } = buildApp(cache, { featureA: true }, 300);

    // First call populates cache
    await request(app).get("/toggles").set("x-api-key", "sk_test123");
    // Second call should hit cache
    const res = await request(app).get("/toggles").set("x-api-key", "sk_test123");

    expect(res.body).toEqual({ featureA: true });
    // GetPublicToggles should only have been called once (first request)
    expect((getPublicToggles.execute as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("checks cache before doing any lookups", async () => {
    const cache = createSpyCache();
    const { app } = buildApp(cache, { featureA: true }, 300);

    await request(app).get("/toggles").set("x-api-key", "sk_test123");

    expect(cache.calls.getByApiKey[0]).toEqual(["sk_test123"]);
  });
});
