import { describe, it, expect, afterEach } from "vitest";
import { loadConfig } from "../env.js";

describe("loadConfig", () => {
  const originalJwt = process.env.JWT_SECRET;
  const originalCors = process.env.CORS_ORIGIN;

  afterEach(() => {
    if (originalJwt !== undefined) process.env.JWT_SECRET = originalJwt;
    else delete process.env.JWT_SECRET;
    if (originalCors !== undefined) process.env.CORS_ORIGIN = originalCors;
    else delete process.env.CORS_ORIGIN;
  });

  it("throws when JWT_SECRET is not set", () => {
    process.env.CORS_ORIGIN = "http://localhost:5173";
    delete process.env.JWT_SECRET;

    expect(() => loadConfig()).toThrow("JWT_SECRET");
  });

  it("throws when CORS_ORIGIN is not set", () => {
    process.env.JWT_SECRET = "test-secret";
    delete process.env.CORS_ORIGIN;

    expect(() => loadConfig()).toThrow("CORS_ORIGIN");
  });

  it("loads config when required vars are set", () => {
    process.env.JWT_SECRET = "my-secret";
    process.env.CORS_ORIGIN = "http://example.com";

    const config = loadConfig();

    expect(config.jwt.secret).toBe("my-secret");
  });
});
