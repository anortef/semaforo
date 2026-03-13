import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type pg from "pg";
import type { Express } from "express";
import { createTestPool, createTestApp, cleanDatabase } from "../../../test/setup.js";

describe("Environment Routes (integration)", () => {
  let pool: pg.Pool;
  let app: Express;
  let appId: string;

  beforeAll(async () => {
    pool = createTestPool();
    app = createTestApp(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await cleanDatabase(pool);
    const res = await request(app)
      .post("/api/apps")
      .send({ name: "Shop", key: "shop" });
    appId = res.body.id.value;
  });

  describe("POST /api/apps/:appId/environments", () => {
    it("creates an environment and returns 201 with default TTL", async () => {
      const res = await request(app)
        .post(`/api/apps/${appId}/environments`)
        .send({ name: "Production", key: "prod" });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Production");
      expect(res.body.key).toBe("prod");
      expect(res.body.appId).toBe(appId);
      expect(res.body.id.value).toBeDefined();
      expect(res.body.cacheTtlSeconds).toBe(300);
    });

    it("rejects duplicate key within same app", async () => {
      await request(app)
        .post(`/api/apps/${appId}/environments`)
        .send({ name: "Production", key: "prod" });

      const res = await request(app)
        .post(`/api/apps/${appId}/environments`)
        .send({ name: "Production 2", key: "prod" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("already exists");
    });

    it("allows same key in different apps", async () => {
      await request(app)
        .post(`/api/apps/${appId}/environments`)
        .send({ name: "Production", key: "prod" });

      const otherApp = await request(app)
        .post("/api/apps")
        .send({ name: "Blog", key: "blog" });

      const res = await request(app)
        .post(`/api/apps/${otherApp.body.id.value}/environments`)
        .send({ name: "Production", key: "prod" });

      expect(res.status).toBe(201);
    });

    it("returns 404 for non-existent app", async () => {
      const res = await request(app)
        .post("/api/apps/non-existent/environments")
        .send({ name: "Dev", key: "dev" });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });
  });

  describe("PATCH /api/environments/:environmentId", () => {
    it("updates cache TTL", async () => {
      const created = await request(app)
        .post(`/api/apps/${appId}/environments`)
        .send({ name: "Prod", key: "prod" });

      const res = await request(app)
        .patch(`/api/environments/${created.body.id.value}`)
        .send({ cacheTtlSeconds: 60 });

      expect(res.status).toBe(200);
      expect(res.body.cacheTtlSeconds).toBe(60);
      expect(res.body.name).toBe("Prod");
    });

    it("updates name only", async () => {
      const created = await request(app)
        .post(`/api/apps/${appId}/environments`)
        .send({ name: "Prod", key: "prod" });

      const res = await request(app)
        .patch(`/api/environments/${created.body.id.value}`)
        .send({ name: "Production" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Production");
      expect(res.body.cacheTtlSeconds).toBe(300);
    });

    it("rejects invalid TTL", async () => {
      const created = await request(app)
        .post(`/api/apps/${appId}/environments`)
        .send({ name: "Prod", key: "prod" });

      const res = await request(app)
        .patch(`/api/environments/${created.body.id.value}`)
        .send({ cacheTtlSeconds: -1 });

      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent environment", async () => {
      const res = await request(app)
        .patch("/api/environments/non-existent")
        .send({ cacheTtlSeconds: 60 });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/apps/:appId/environments", () => {
    it("returns empty array when no environments exist", async () => {
      const res = await request(app).get(`/api/apps/${appId}/environments`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns all environments for an app", async () => {
      await request(app)
        .post(`/api/apps/${appId}/environments`)
        .send({ name: "Dev", key: "dev" });
      await request(app)
        .post(`/api/apps/${appId}/environments`)
        .send({ name: "Prod", key: "prod" });

      const res = await request(app).get(`/api/apps/${appId}/environments`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });
});
