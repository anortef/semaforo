import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { publicRoutes } from "../publicRoutes.js";
import type { GetPublicToggles } from "../../../../application/GetPublicToggles.js";
import type { EnvironmentRepository, AppRepository } from "@semaforo/domain";
import type { ToggleCache } from "../../../cache/RedisToggleCache.js";

const SDK_SECRET = "sdk-test-secret";

function noopCache(): ToggleCache {
  return {
    async get() { return null; },
    async set() {},
    async invalidate() {},
    async getByApiKey() { return null; },
    async setByApiKey() {},
    async getCacheInfo() { return null; },
  };
}

function buildApp() {
  const getPublicToggles = {
    execute: vi.fn().mockResolvedValue({ featureA: true }),
  } as unknown as GetPublicToggles & { execute: ReturnType<typeof vi.fn> };

  const environmentRepository = {
    findById: vi.fn().mockResolvedValue({
      id: { value: "env-1" }, appId: "app-1", key: "prod",
      name: "Production", cacheTtlSeconds: 300, createdAt: new Date(),
    }),
  } as unknown as EnvironmentRepository;

  const appRepository = {
    findById: vi.fn().mockResolvedValue({
      id: { value: "app-1" }, key: "shop", name: "Shop",
      description: "", createdAt: new Date(),
    }),
  } as unknown as AppRepository;

  const app = express();
  app.use((req, res, next) => {
    res.locals.apiKeyEnvironmentId = "env-1";
    res.locals.apiKeyValue = req.headers["x-api-key"];
    next();
  });
  app.use(publicRoutes(getPublicToggles, SDK_SECRET, environmentRepository, appRepository, noopCache()));
  return { app, getPublicToggles };
}

describe("publicRoutes — x-user-id JWT verification", () => {
  it("accepts a valid JWT signed with SDK_JWT_SECRET and forwards the userId", async () => {
    const { app, getPublicToggles } = buildApp();
    const token = jwt.sign({ userId: "alice" }, SDK_SECRET, { algorithm: "HS256" });

    const res = await request(app)
      .get("/toggles")
      .set("x-api-key", "sk_test")
      .set("x-user-id", token);

    expect(res.status).toBe(200);
    expect(getPublicToggles.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "alice" }),
    );
  });

  it("rejects an unsigned plain userId string with 401", async () => {
    const { app, getPublicToggles } = buildApp();

    const res = await request(app)
      .get("/toggles")
      .set("x-api-key", "sk_test")
      .set("x-user-id", "alice-not-a-jwt");

    expect(res.status).toBe(401);
    expect(getPublicToggles.execute).not.toHaveBeenCalled();
  });

  it("rejects a JWT signed with the wrong secret", async () => {
    const { app, getPublicToggles } = buildApp();
    const token = jwt.sign({ userId: "alice" }, "wrong-secret", { algorithm: "HS256" });

    const res = await request(app)
      .get("/toggles")
      .set("x-api-key", "sk_test")
      .set("x-user-id", token);

    expect(res.status).toBe(401);
    expect(getPublicToggles.execute).not.toHaveBeenCalled();
  });

  it("rejects a JWT without a userId claim", async () => {
    const { app, getPublicToggles } = buildApp();
    const token = jwt.sign({ sub: "alice" }, SDK_SECRET, { algorithm: "HS256" });

    const res = await request(app)
      .get("/toggles")
      .set("x-api-key", "sk_test")
      .set("x-user-id", token);

    expect(res.status).toBe(401);
    expect(getPublicToggles.execute).not.toHaveBeenCalled();
  });

  it("falls back to anonymous when x-user-id is omitted", async () => {
    const { app, getPublicToggles } = buildApp();

    const res = await request(app).get("/toggles").set("x-api-key", "sk_test");

    expect(res.status).toBe(200);
    expect(getPublicToggles.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: undefined }),
    );
  });

  it("rejects a JWT signed with `none` algorithm", async () => {
    const { app, getPublicToggles } = buildApp();
    const token = jwt.sign(
      { userId: "alice" },
      "",
      { algorithm: "none" } as jwt.SignOptions,
    );

    const res = await request(app)
      .get("/toggles")
      .set("x-api-key", "sk_test")
      .set("x-user-id", token);

    expect(res.status).toBe(401);
    expect(getPublicToggles.execute).not.toHaveBeenCalled();
  });
});
