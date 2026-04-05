import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import type pg from "pg";
import type { Express } from "express";
import { createTestPool, createTestApp, cleanDatabase, seedTestAdmin } from "../../../test/setup.js";

describe("Public Routes (integration)", () => {
  let pool: pg.Pool;
  let app: Express;
  let token: string;

  beforeAll(async () => {
    pool = createTestPool();
    app = createTestApp(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  function auth(req: supertest.Test): supertest.Test {
    return req.set("Authorization", `Bearer ${token}`);
  }

  beforeEach(async () => {
    await cleanDatabase(pool);
    await seedTestAdmin(pool);
    const loginRes = await supertest(app)
      .post("/api/auth/login")
      .send({ email: "admin@semaforo.local", password: "admin" });
    token = loginRes.body.token;
  });

  async function createAppEnvWithKey(appName: string, appKey: string, envName: string, envKey: string) {
    const appRes = await auth(
      supertest(app).post("/api/apps")
    ).send({ name: appName, key: appKey });
    const appId = appRes.body.id.value;

    // CreateEnvironment auto-generates an API key
    const envRes = await auth(
      supertest(app).post(`/api/apps/${appId}/environments`)
    ).send({ name: envName, key: envKey });
    const envId = envRes.body.id.value;

    // List keys to get the auto-generated one
    const keysRes = await auth(
      supertest(app).get(`/api/environments/${envId}/api-keys`)
    );
    const apiKey = keysRes.body[0].key;

    return { appId, envId, apiKey };
  }

  describe("GET /api/public/apps/:appKey/environments/:envKey/toggles", () => {
    it("returns 401 without API key", async () => {
      const res = await supertest(app).get(
        "/api/public/apps/shop/environments/prod/toggles"
      );
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("API key required");
    });

    it("returns 401 with invalid API key", async () => {
      const res = await supertest(app)
        .get("/api/public/apps/shop/environments/prod/toggles")
        .set("x-api-key", "sk_invalid");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid API key");
    });

    it("accepts API key via x-api-key header", async () => {
      const { apiKey } = await createAppEnvWithKey("Shop", "shop", "Dev", "dev");

      const res = await supertest(app)
        .get("/api/public/apps/shop/environments/dev/toggles")
        .set("x-api-key", apiKey);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it("accepts API key via apiKey query param", async () => {
      const { apiKey } = await createAppEnvWithKey("Shop", "shop", "Dev", "dev");

      const res = await supertest(app)
        .get(`/api/public/apps/shop/environments/dev/toggles?apiKey=${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it("returns toggle map for an app environment", async () => {
      const { appId, envId, apiKey } = await createAppEnvWithKey("Shop", "shop", "Production", "prod");

      const t1 = await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({ name: "New Checkout", key: "newCheckout" });
      await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({ name: "Beta Search", key: "betaSearch" });

      await auth(
        supertest(app).put(`/api/toggles/${t1.body.id.value}/environments/${envId}`)
      ).send({ enabled: true });

      const res = await supertest(app)
        .get("/api/public/apps/shop/environments/prod/toggles")
        .set("x-api-key", apiKey);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        newCheckout: true,
        betaSearch: false,
      });
    });

    it("returns 404 for non-existent app", async () => {
      const { apiKey } = await createAppEnvWithKey("Shop", "shop", "Dev", "dev");

      const res = await supertest(app)
        .get("/api/public/apps/nope/environments/prod/toggles")
        .set("x-api-key", apiKey);

      expect(res.status).toBe(404);
    });
  });
});
