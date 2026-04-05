import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import type pg from "pg";
import type { Express } from "express";
import { createTestPool, createTestApp, cleanDatabase, seedTestAdmin } from "../../../test/setup.js";

describe("Toggle Routes (integration)", () => {
  let pool: pg.Pool;
  let app: Express;
  let appId: string;
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

    const res = await auth(
      supertest(app).post("/api/apps")
    ).send({ name: "Shop", key: "shop" });
    appId = res.body.id.value;
  });

  describe("POST /api/apps/:appId/toggles", () => {
    it("creates a toggle and returns 201", async () => {
      const res = await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({ name: "New Checkout", key: "newCheckout" });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("New Checkout");
      expect(res.body.key).toBe("newCheckout");
      expect(res.body.appId).toBe(appId);
    });

    it("creates a toggle with description", async () => {
      const res = await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({
        name: "New Checkout",
        key: "newCheckout",
        description: "Revamped checkout flow",
      });

      expect(res.status).toBe(201);
      expect(res.body.description).toBe("Revamped checkout flow");
    });

    it("rejects duplicate key within same app", async () => {
      await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({ name: "New Checkout", key: "newCheckout" });

      const res = await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({ name: "New Checkout V2", key: "newCheckout" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("already exists");
    });

    it("rejects invalid key format", async () => {
      const res = await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({ name: "Test", key: "new-checkout" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Toggle key must be camelCase");
    });

    it("returns 404 for non-existent app", async () => {
      const res = await auth(
        supertest(app).post("/api/apps/non-existent/toggles")
      ).send({ name: "Test", key: "testToggle" });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/apps/:appId/toggles", () => {
    it("returns empty array when no toggles exist", async () => {
      const res = await auth(
        supertest(app).get(`/api/apps/${appId}/toggles`)
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns all toggles for an app", async () => {
      await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({ name: "New Checkout", key: "newCheckout" });
      await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({ name: "Beta Search", key: "betaSearch" });

      const res = await auth(
        supertest(app).get(`/api/apps/${appId}/toggles`)
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe("PUT /api/toggles/:toggleId/environments/:environmentId", () => {
    let envId: string;
    let toggleId: string;

    beforeEach(async () => {
      const envRes = await auth(
        supertest(app).post(`/api/apps/${appId}/environments`)
      ).send({ name: "Production", key: "prod" });
      envId = envRes.body.id.value;

      const toggleRes = await auth(
        supertest(app).post(`/api/apps/${appId}/toggles`)
      ).send({ name: "New Checkout", key: "newCheckout" });
      toggleId = toggleRes.body.id.value;
    });

    it("sets a toggle value to enabled", async () => {
      const res = await auth(
        supertest(app).put(`/api/toggles/${toggleId}/environments/${envId}`)
      ).send({ enabled: true });

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(true);
      expect(res.body.toggleId).toBe(toggleId);
      expect(res.body.environmentId).toBe(envId);
    });

    it("updates an existing toggle value", async () => {
      await auth(
        supertest(app).put(`/api/toggles/${toggleId}/environments/${envId}`)
      ).send({ enabled: true });

      const res = await auth(
        supertest(app).put(`/api/toggles/${toggleId}/environments/${envId}`)
      ).send({ enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
    });

    it("returns 404 for non-existent toggle", async () => {
      const res = await auth(
        supertest(app).put(`/api/toggles/non-existent/environments/${envId}`)
      ).send({ enabled: true });

      expect(res.status).toBe(404);
    });

    it("returns 400 when toggle and env belong to different apps", async () => {
      const otherApp = await auth(
        supertest(app).post("/api/apps")
      ).send({ name: "Blog", key: "blog" });
      const otherEnv = await auth(
        supertest(app).post(`/api/apps/${otherApp.body.id.value}/environments`)
      ).send({ name: "Dev", key: "dev" });

      const res = await auth(
        supertest(app).put(`/api/toggles/${toggleId}/environments/${otherEnv.body.id.value}`)
      ).send({ enabled: true });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("different apps");
    });
  });
});
