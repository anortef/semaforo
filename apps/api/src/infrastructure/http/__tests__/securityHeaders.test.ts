import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "../../test/setup.js";
import pg from "pg";

describe("Security Headers", () => {
  let app: Express;
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new pg.Pool();
    app = createTestApp(pool);
  });

  it("sets X-Content-Type-Options header", async () => {
    const res = await request(app).get("/api/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("sets X-Frame-Options header", async () => {
    const res = await request(app).get("/api/health");

    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });
});
