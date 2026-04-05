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

  describe("GET /api/public/apps/:appKey/environments/:envKey/toggles", () => {
    it("returns toggle map for an app environment", async () => {
      const appRes = await auth(
        supertest(app).post("/api/apps")
      ).send({ name: "Shop", key: "shop" });
      const appId = appRes.body.id.value;

      const envRes = await auth(
        supertest(app).post(`/api/apps/${appId}/environments`)
      ).send({ name: "Production", key: "prod" });
      const envId = envRes.body.id.value;

      const t1 = await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({ name: "New Checkout", key: "newCheckout" });
      const t2 = await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({ name: "Beta Search", key: "betaSearch" });

      await auth(
        supertest(app).put(`/api/toggles/${t1.body.id.value}/environments/${envId}`)
      ).send({ enabled: true });

      // Public endpoint — no auth needed
      const res = await supertest(app).get(
        "/api/public/apps/shop/environments/prod/toggles"
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        newCheckout: true,
        betaSearch: false,
      });
    });

    it("returns all false for toggles with no values set", async () => {
      const appRes = await auth(
        supertest(app).post("/api/apps")
      ).send({ name: "Shop", key: "shop" });
      const appId = appRes.body.id.value;

      await auth(
        supertest(app).post(`/api/apps/${appId}/environments`)
      ).send({ name: "Dev", key: "dev" });
      await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({ name: "Feature A", key: "featureA" });

      const res = await supertest(app).get(
        "/api/public/apps/shop/environments/dev/toggles"
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ featureA: false });
    });

    it("returns empty object when no toggles exist", async () => {
      const appRes = await auth(
        supertest(app).post("/api/apps")
      ).send({ name: "Shop", key: "shop" });
      await auth(
        supertest(app).post(`/api/apps/${appRes.body.id.value}/environments`)
      ).send({ name: "Dev", key: "dev" });

      const res = await supertest(app).get(
        "/api/public/apps/shop/environments/dev/toggles"
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it("returns 404 for non-existent app", async () => {
      const res = await supertest(app).get(
        "/api/public/apps/nope/environments/prod/toggles"
      );

      expect(res.status).toBe(404);
    });

    it("returns 404 for non-existent environment", async () => {
      await auth(
        supertest(app).post("/api/apps")
      ).send({ name: "Shop", key: "shop" });

      const res = await supertest(app).get(
        "/api/public/apps/shop/environments/nope/toggles"
      );

      expect(res.status).toBe(404);
    });

    it("returns different values per environment", async () => {
      const appRes = await auth(
        supertest(app).post("/api/apps")
      ).send({ name: "Shop", key: "shop" });
      const appId = appRes.body.id.value;

      const devEnv = await auth(
        supertest(app).post(`/api/apps/${appId}/environments`)
      ).send({ name: "Dev", key: "dev" });
      const prodEnv = await auth(
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

      const devRes = await supertest(app).get(
        "/api/public/apps/shop/environments/dev/toggles"
      );
      const prodRes = await supertest(app).get(
        "/api/public/apps/shop/environments/prod/toggles"
      );

      expect(devRes.body).toEqual({ newCheckout: true });
      expect(prodRes.body).toEqual({ newCheckout: false });
    });
  });
});
