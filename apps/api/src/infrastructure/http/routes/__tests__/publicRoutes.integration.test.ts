import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type pg from "pg";
import type { Express } from "express";
import { createTestPool, createTestApp, cleanDatabase } from "../../../test/setup.js";

describe("Public Routes (integration)", () => {
  let pool: pg.Pool;
  let app: Express;

  beforeAll(async () => {
    pool = createTestPool();
    app = createTestApp(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await cleanDatabase(pool);
  });

  describe("GET /api/public/apps/:appKey/environments/:envKey/toggles", () => {
    it("returns toggle map for an app environment", async () => {
      // Create app
      const appRes = await request(app)
        .post("/api/apps")
        .send({ name: "Shop", key: "shop" });
      const appId = appRes.body.id.value;

      // Create environment
      const envRes = await request(app)
        .post(`/api/apps/${appId}/environments`)
        .send({ name: "Production", key: "prod" });
      const envId = envRes.body.id.value;

      // Create toggles
      const t1 = await request(app)
        .post(`/api/apps/${appId}/toggles`)
        .send({ name: "New Checkout", key: "newCheckout" });
      const t2 = await request(app)
        .post(`/api/apps/${appId}/toggles`)
        .send({ name: "Beta Search", key: "betaSearch" });

      // Enable only newCheckout in prod
      await request(app)
        .put(`/api/toggles/${t1.body.id.value}/environments/${envId}`)
        .send({ enabled: true });

      // Fetch public endpoint
      const res = await request(app).get(
        "/api/public/apps/shop/environments/prod/toggles"
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        newCheckout: true,
        betaSearch: false,
      });
    });

    it("returns all false for toggles with no values set", async () => {
      const appRes = await request(app)
        .post("/api/apps")
        .send({ name: "Shop", key: "shop" });
      const appId = appRes.body.id.value;

      await request(app)
        .post(`/api/apps/${appId}/environments`)
        .send({ name: "Dev", key: "dev" });
      await request(app)
        .post(`/api/apps/${appId}/toggles`)
        .send({ name: "Feature A", key: "featureA" });

      const res = await request(app).get(
        "/api/public/apps/shop/environments/dev/toggles"
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ featureA: false });
    });

    it("returns empty object when no toggles exist", async () => {
      const appRes = await request(app)
        .post("/api/apps")
        .send({ name: "Shop", key: "shop" });
      await request(app)
        .post(`/api/apps/${appRes.body.id.value}/environments`)
        .send({ name: "Dev", key: "dev" });

      const res = await request(app).get(
        "/api/public/apps/shop/environments/dev/toggles"
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it("returns 404 for non-existent app", async () => {
      const res = await request(app).get(
        "/api/public/apps/nope/environments/prod/toggles"
      );

      expect(res.status).toBe(404);
    });

    it("returns 404 for non-existent environment", async () => {
      await request(app)
        .post("/api/apps")
        .send({ name: "Shop", key: "shop" });

      const res = await request(app).get(
        "/api/public/apps/shop/environments/nope/toggles"
      );

      expect(res.status).toBe(404);
    });

    it("returns different values per environment", async () => {
      const appRes = await request(app)
        .post("/api/apps")
        .send({ name: "Shop", key: "shop" });
      const appId = appRes.body.id.value;

      const devEnv = await request(app)
        .post(`/api/apps/${appId}/environments`)
        .send({ name: "Dev", key: "dev" });
      const prodEnv = await request(app)
        .post(`/api/apps/${appId}/environments`)
        .send({ name: "Prod", key: "prod" });

      const toggle = await request(app)
        .post(`/api/apps/${appId}/toggles`)
        .send({ name: "New Checkout", key: "newCheckout" });

      // Enable in dev, leave disabled in prod
      await request(app)
        .put(
          `/api/toggles/${toggle.body.id.value}/environments/${devEnv.body.id.value}`
        )
        .send({ enabled: true });

      const devRes = await request(app).get(
        "/api/public/apps/shop/environments/dev/toggles"
      );
      const prodRes = await request(app).get(
        "/api/public/apps/shop/environments/prod/toggles"
      );

      expect(devRes.body).toEqual({ newCheckout: true });
      expect(prodRes.body).toEqual({ newCheckout: false });
    });
  });
});
