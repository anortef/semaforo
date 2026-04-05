import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import type pg from "pg";
import type { Express } from "express";
import { createTestPool, createTestApp, cleanDatabase, seedTestAdmin } from "../../../test/setup.js";

describe("App Routes (integration)", () => {
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

  beforeEach(async () => {
    await cleanDatabase(pool);
    await seedTestAdmin(pool);
    const res = await supertest(app)
      .post("/api/auth/login")
      .send({ email: "admin@semaforo.local", password: "admin" });
    token = res.body.token;
  });

  function auth(req: supertest.Test): supertest.Test {
    return req.set("Authorization", `Bearer ${token}`);
  }

  describe("POST /api/apps", () => {
    it("creates an app and returns 201", async () => {
      const res = await auth(
        supertest(app).post("/api/apps")
      ).send({ name: "Shop Application", key: "shop" });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Shop Application");
      expect(res.body.key).toBe("shop");
      expect(res.body.id.value).toBeDefined();
      expect(res.body.description).toBe("");
    });

    it("creates an app with description", async () => {
      const res = await auth(
        supertest(app).post("/api/apps")
      ).send({
        name: "Shop Application",
        key: "shop",
        description: "Main e-commerce app",
      });

      expect(res.status).toBe(201);
      expect(res.body.description).toBe("Main e-commerce app");
    });

    it("rejects duplicate key with 400", async () => {
      await auth(supertest(app).post("/api/apps")).send({ name: "Shop", key: "shop" });

      const res = await auth(
        supertest(app).post("/api/apps")
      ).send({ name: "Shop 2", key: "shop" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("already exists");
    });

    it("rejects invalid key format with 400", async () => {
      const res = await auth(
        supertest(app).post("/api/apps")
      ).send({ name: "Shop", key: "INVALID" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("App key must be lowercase");
    });

    it("rejects empty name with 400", async () => {
      const res = await auth(
        supertest(app).post("/api/apps")
      ).send({ name: "", key: "empty-name-test" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("name cannot be empty");
    });
  });

  describe("GET /api/apps", () => {
    it("returns empty array when no apps exist", async () => {
      const res = await auth(supertest(app).get("/api/apps"));

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns all apps", async () => {
      await auth(supertest(app).post("/api/apps")).send({ name: "Shop", key: "shop" });
      await auth(supertest(app).post("/api/apps")).send({ name: "Blog", key: "blog" });

      const res = await auth(supertest(app).get("/api/apps"));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe("GET /api/apps/:appId", () => {
    it("returns an app by id", async () => {
      const created = await auth(
        supertest(app).post("/api/apps")
      ).send({ name: "Shop", key: "shop" });

      const res = await auth(
        supertest(app).get(`/api/apps/${created.body.id.value}`)
      );

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Shop");
      expect(res.body.key).toBe("shop");
    });

    it("returns 404 for non-existent app", async () => {
      const res = await auth(
        supertest(app).get("/api/apps/non-existent-id")
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });
  });
});
