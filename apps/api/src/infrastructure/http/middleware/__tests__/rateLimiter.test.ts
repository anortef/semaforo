import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createLoginLimiter, createPublicLimiter, createCacheMissLimiter } from "../rateLimiter.js";

describe("loginLimiter", () => {
  it("allows requests under the limit", async () => {
    const app = express();
    app.use(createLoginLimiter(3, 60_000));
    app.post("/login", (_req, res) => { res.json({ ok: true }); });

    const res = await request(app).post("/login");

    expect(res.status).toBe(200);
  });

  it("blocks requests over the limit", async () => {
    const app = express();
    app.use(createLoginLimiter(3, 60_000));
    app.post("/login", (_req, res) => { res.json({ ok: true }); });

    await request(app).post("/login");
    await request(app).post("/login");
    await request(app).post("/login");
    const res = await request(app).post("/login");

    expect(res.status).toBe(429);
  });
});

describe("publicLimiter", () => {
  it("has a generous default limit", async () => {
    const app = express();
    app.use(createPublicLimiter());
    app.get("/test", (_req, res) => { res.json({ ok: true }); });

    const res = await request(app).get("/test");

    expect(res.status).toBe(200);
  });
});

describe("cacheMissLimiter", () => {
  it("allows requests under the limit", async () => {
    const limiter = createCacheMissLimiter(3, 60_000);
    const app = express();
    app.get("/test", (req, res, next) => {
      limiter(req, res, () => { res.json({ ok: true }); });
    });

    const res = await request(app).get("/test");

    expect(res.status).toBe(200);
  });

  it("blocks after exceeding limit", async () => {
    const limiter = createCacheMissLimiter(2, 60_000);
    const app = express();
    app.get("/test", (req, res) => {
      limiter(req, res, () => { res.json({ ok: true }); });
    });

    await request(app).get("/test");
    await request(app).get("/test");
    const res = await request(app).get("/test");

    expect(res.status).toBe(429);
  });
});
