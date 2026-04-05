import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type pg from "pg";
import type { Express } from "express";
import { createTestPool, createTestApp, cleanDatabase } from "../../../test/setup.js";
import { PgUserRepository } from "../../../persistence/PgUserRepository.js";
import { createUser } from "@semaforo/domain";
import { v4 as uuid } from "uuid";

const JWT_SECRET = "semaforo-dev-secret";

describe("Auth Routes (integration)", () => {
  let pool: pg.Pool;
  let app: Express;
  let userRepo: PgUserRepository;

  beforeAll(async () => {
    pool = createTestPool();
    app = createTestApp(pool);
    userRepo = new PgUserRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await cleanDatabase(pool);

    const hash = await bcrypt.hash("admin", 10);
    const admin = createUser({
      id: uuid(),
      email: "admin@semaforo.local",
      name: "Admin",
      passwordHash: hash,
      role: "admin",
    });
    await userRepo.save(admin);
  });

  describe("POST /api/auth/login", () => {
    it("returns token for valid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@semaforo.local", password: "admin" });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();

      const decoded = jwt.verify(res.body.token, JWT_SECRET) as Record<string, unknown>;
      expect(decoded.email).toBe("admin@semaforo.local");
      expect(decoded.role).toBe("admin");
    });

    it("returns 401 for wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@semaforo.local", password: "wrong" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid credentials");
    });

    it("returns 401 for unknown email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@example.com", password: "admin" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid credentials");
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns user info for valid token", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@semaforo.local", password: "admin" });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${loginRes.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe("admin@semaforo.local");
      expect(res.body.role).toBe("admin");
    });

    it("returns 401 without token", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
    });
  });

  describe("Protected routes require auth", () => {
    it("GET /api/apps returns 401 without token", async () => {
      const res = await request(app).get("/api/apps");
      expect(res.status).toBe(401);
    });

    it("GET /api/apps returns 200 with valid token", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@semaforo.local", password: "admin" });

      const res = await request(app)
        .get("/api/apps")
        .set("Authorization", `Bearer ${loginRes.body.token}`);

      expect(res.status).toBe(200);
    });

    it("GET /api/public/* remains accessible without token", async () => {
      const res = await request(app)
        .get("/api/public/apps/nonexistent/environments/test/toggles");

      // Should get 404 (app not found), not 401
      expect(res.status).not.toBe(401);
    });

    it("GET /api/health remains accessible without token", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
    });
  });
});
