import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createLoginLimiter } from "../rateLimiter.js";

function buildApp() {
  const app = express();
  app.use(createLoginLimiter(3, 60_000));
  app.post("/login", (_req, res) => { res.json({ ok: true }); });
  return app;
}

describe("rateLimiter", () => {
  it("allows requests under the limit", async () => {
    const app = buildApp();

    const res = await request(app).post("/login");

    expect(res.status).toBe(200);
  });

  it("blocks requests over the limit", async () => {
    const app = buildApp();

    await request(app).post("/login");
    await request(app).post("/login");
    await request(app).post("/login");
    const res = await request(app).post("/login");

    expect(res.status).toBe(429);
  });
});
