import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createLoginLimiter, createPublicLimiter, createCacheMissLimiter, createRateLimitConfigReader } from "../rateLimiter.js";
import type { RateLimitConfigReader } from "../rateLimiter.js";

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
  it("uses dynamic max from config reader", async () => {
    const reader: RateLimitConfigReader = {
      getPublicLimit: async () => 2,
      getCacheMissLimit: async () => 100,
    };
    const app = express();
    app.use(createPublicLimiter(reader));
    app.get("/test", (_req, res) => { res.json({ ok: true }); });

    await request(app).get("/test");
    await request(app).get("/test");
    const res = await request(app).get("/test");

    expect(res.status).toBe(429);
  });
});

describe("cacheMissLimiter", () => {
  it("uses dynamic max from config reader", async () => {
    const reader: RateLimitConfigReader = {
      getPublicLimit: async () => 100_000,
      getCacheMissLimit: async () => 2,
    };
    const limiter = createCacheMissLimiter(reader);
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

describe("createRateLimitConfigReader", () => {
  it("returns default when no cache or db value", async () => {
    const cache = { get: async () => null, set: async () => {} };
    const db = { findByKey: async () => null };
    const reader = createRateLimitConfigReader(cache as any, db as any);

    expect(await reader.getPublicLimit()).toBe(100_000);
  });

  it("reads from cache first", async () => {
    const cache = { get: async (k: string) => k === "ratelimit:public" ? "500" : null, set: async () => {} };
    const db = { findByKey: async () => null };
    const reader = createRateLimitConfigReader(cache as any, db as any);

    expect(await reader.getPublicLimit()).toBe(500);
  });

  it("falls back to db and caches result", async () => {
    let cached: string | null = null;
    const cache = {
      get: async () => cached,
      set: async (_k: string, v: string) => { cached = v; },
    };
    const db = { findByKey: async (k: string) => k === "rateLimitPublic" ? { value: "2000" } : null };
    const reader = createRateLimitConfigReader(cache as any, db as any);

    expect(await reader.getPublicLimit()).toBe(2000);
  });
});
