import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createAdminMiddleware } from "../adminMiddleware.js";

function buildApp(role: string) {
  const app = express();
  app.use((_req, res, next) => {
    res.locals.role = role;
    res.locals.userId = "user-1";
    next();
  });
  app.use(createAdminMiddleware());
  app.get("/admin", (_req, res) => { res.json({ ok: true }); });
  return app;
}

describe("adminMiddleware", () => {
  it("allows admin role", async () => {
    const res = await request(buildApp("admin")).get("/admin");

    expect(res.status).toBe(200);
  });

  it("rejects user role with 403", async () => {
    const res = await request(buildApp("user")).get("/admin");

    expect(res.status).toBe(403);
  });

  it("returns error message for non-admin", async () => {
    const res = await request(buildApp("user")).get("/admin");

    expect(res.body.error).toBe("Admin access required");
  });
});
