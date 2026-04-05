import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import supertest from "supertest";
import type pg from "pg";
import type { Express } from "express";
import { createTestPool, createTestApp, cleanDatabase, seedTestAdmin } from "../../../test/setup.js";

describe("Admin Routes (integration)", () => {
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

  describe("GET /api/admin/users", () => {
    it("returns user list for admin", async () => {
      const res = await auth(supertest(app).get("/api/admin/users"));

      expect(res.body.users.length).toBeGreaterThanOrEqual(1);
    });

    it("returns 401 without auth", async () => {
      const res = await supertest(app).get("/api/admin/users");

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/admin/users", () => {
    it("creates a new user", async () => {
      const res = await auth(supertest(app).post("/api/admin/users"))
        .send({ email: "new@test.com", name: "New", password: "pass123", role: "user" });

      expect(res.status).toBe(201);
    });

    it("rejects duplicate email", async () => {
      await auth(supertest(app).post("/api/admin/users"))
        .send({ email: "dup@test.com", name: "A", password: "p", role: "user" });
      const res = await auth(supertest(app).post("/api/admin/users"))
        .send({ email: "dup@test.com", name: "B", password: "p", role: "user" });

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/admin/users/:userId", () => {
    it("updates a user name", async () => {
      const createRes = await auth(supertest(app).post("/api/admin/users"))
        .send({ email: "patch@test.com", name: "Old", password: "p", role: "user" });
      const userId = createRes.body.id.value;

      const res = await auth(supertest(app).patch(`/api/admin/users/${userId}`))
        .send({ name: "New Name" });

      expect(res.body.name).toBe("New Name");
    });
  });

  describe("DELETE /api/admin/users/:userId", () => {
    it("deletes a user", async () => {
      const createRes = await auth(supertest(app).post("/api/admin/users"))
        .send({ email: "del@test.com", name: "Del", password: "p", role: "user" });
      const userId = createRes.body.id.value;

      const res = await auth(supertest(app).delete(`/api/admin/users/${userId}`));

      expect(res.status).toBe(204);
    });
  });

  describe("POST /api/admin/users/:userId/reset-password", () => {
    it("resets a user password", async () => {
      const createRes = await auth(supertest(app).post("/api/admin/users"))
        .send({ email: "reset@test.com", name: "Reset", password: "old", role: "user" });
      const userId = createRes.body.id.value;

      const res = await auth(supertest(app).post(`/api/admin/users/${userId}/reset-password`))
        .send({ newPassword: "newpass123" });

      expect(res.status).toBe(204);
    });
  });

  describe("GET /api/admin/settings", () => {
    it("returns settings list", async () => {
      const res = await auth(supertest(app).get("/api/admin/settings"));

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("PUT /api/admin/settings/:key", () => {
    it("creates or updates a setting", async () => {
      const res = await auth(supertest(app).put("/api/admin/settings/publicDomain"))
        .send({ value: "https://example.com" });

      expect(res.body.value).toBe("https://example.com");
    });
  });

  describe("GET /api/admin/audit-log", () => {
    it("returns audit log entries", async () => {
      // Create a user to generate an audit event
      await auth(supertest(app).post("/api/admin/users"))
        .send({ email: "audit@test.com", name: "Audit", password: "p", role: "user" });

      const res = await auth(supertest(app).get("/api/admin/audit-log"));

      expect(res.body.entries.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("GET /api/admin/health", () => {
    it("returns health status", async () => {
      const res = await auth(supertest(app).get("/api/admin/health"));

      expect(res.body.database).toBe("ok");
    });
  });
});
