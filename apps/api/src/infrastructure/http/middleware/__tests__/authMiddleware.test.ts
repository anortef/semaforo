import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import express from "express";
import request from "supertest";
import { createAuthMiddleware } from "../authMiddleware.js";

const SECRET = "test-secret";

function buildApp() {
  const app = express();
  app.use(createAuthMiddleware(SECRET));
  app.get("/protected", (_req, res) => {
    res.json({ ok: true, user: (res as unknown as Record<string, unknown>).locals });
  });
  return app;
}

describe("authMiddleware", () => {
  it("returns 401 when no Authorization header", async () => {
    const res = await request(buildApp()).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication required");
  });

  it("returns 401 for malformed header", async () => {
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", "NotBearer token");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication required");
  });

  it("returns 401 for invalid token", async () => {
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", "Bearer invalid.token.here");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid or expired token");
  });

  it("allows request with valid token", async () => {
    const token = jwt.sign(
      { userId: "u1", email: "a@b.com", role: "admin" },
      SECRET
    );
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("attaches user info to res.locals", async () => {
    const app = express();
    app.use(createAuthMiddleware(SECRET));
    app.get("/me", (_req, res) => {
      res.json({
        userId: res.locals.userId,
        email: res.locals.email,
        role: res.locals.role,
      });
    });

    const token = jwt.sign(
      { userId: "u1", email: "a@b.com", role: "admin" },
      SECRET
    );
    const res = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.userId).toBe("u1");
    expect(res.body.email).toBe("a@b.com");
    expect(res.body.role).toBe("admin");
  });
});
