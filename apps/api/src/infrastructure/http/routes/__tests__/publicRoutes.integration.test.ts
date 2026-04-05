import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import type pg from "pg";
import type { Express } from "express";
import { createTestPool, createTestApp, cleanDatabase, seedTestAdmin } from "../../../test/setup.js";

describe("Public Routes (integration)", () => {
  let pool: pg.Pool;
  let app: Express;
  let token: string;
  let apiKey: string;

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

  async function createAppWithApiKey(appName: string, appKey: string): Promise<{ appId: string; apiKey: string }> {
    const appRes = await auth(
      supertest(app).post("/api/apps")
    ).send({ name: appName, key: appKey });
    const appId = appRes.body.id.value;

    const keyRes = await auth(
      supertest(app).post(`/api/apps/${appId}/api-keys`)
    ).send({ name: "Test Key" });
    return { appId, apiKey: keyRes.body.key };
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
      const { appId, apiKey } = await createAppWithApiKey("Shop", "shop");
      await auth(
        supertest(app).post(`/api/apps/${appId}/environments`)
      ).send({ name: "Dev", key: "dev" });

      const res = await supertest(app)
        .get("/api/public/apps/shop/environments/dev/toggles")
        .set("x-api-key", apiKey);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it("accepts API key via apiKey query param", async () => {
      const { appId, apiKey } = await createAppWithApiKey("Shop", "shop");
      await auth(
        supertest(app).post(`/api/apps/${appId}/environments`)
      ).send({ name: "Dev", key: "dev" });

      const res = await supertest(app)
        .get(`/api/public/apps/shop/environments/dev/toggles?apiKey=${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it("returns toggle map for an app environment", async () => {
      const { appId, apiKey } = await createAppWithApiKey("Shop", "shop");

      const envRes = await auth(
        supertest(app).post(`/api/apps/${appId}/environments`)
      ).send({ name: "Production", key: "prod" });
      const envId = envRes.body.id.value;

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
      const { apiKey } = await createAppWithApiKey("Shop", "shop");

      const res = await supertest(app)
        .get("/api/public/apps/nope/environments/prod/toggles")
        .set("x-api-key", apiKey);

      expect(res.status).toBe(404);
    });

    it("returns different values per environment", async () => {
      const { appId, apiKey } = await createAppWithApiKey("Shop", "shop");

      const devEnv = await auth(
        supertest(app).post(`/api/apps/${appId}/environments`)
      ).send({ name: "Dev", key: "dev" });
      await auth(
        supertest(app).post(`/api/apps/${appId}/environments`)
      ).send({ name: "Prod", key: "prod" });

      const toggle = await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({ name: "New Checkout", key: "newCheckout" });

      await auth(
        supertest(app).put(
          `/api/toggles/${toggle.body.id.value}/environments/${devEnv.body.id.value}`
        )
      ).send({ enabled: true });

      const devRes = await supertest(app)
        .get("/api/public/apps/shop/environments/dev/toggles")
        .set("x-api-key", apiKey);
      const prodRes = await supertest(app)
        .get("/api/public/apps/shop/environments/prod/toggles")
        .set("x-api-key", apiKey);

      expect(devRes.body).toEqual({ newCheckout: true });
      expect(prodRes.body).toEqual({ newCheckout: false });
    });
  });
});
