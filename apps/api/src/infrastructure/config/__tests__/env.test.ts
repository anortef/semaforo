import { describe, it, expect, afterEach } from "vitest";
import { loadConfig } from "../env.js";

describe("loadConfig", () => {
  const originalJwt = process.env.JWT_SECRET;
  const originalCors = process.env.CORS_ORIGIN;
  const originalEnc = process.env.ENCRYPTION_KEY;
  const originalSdk = process.env.SDK_JWT_SECRET;

  const setAllRequired = () => {
    process.env.JWT_SECRET = "test-secret";
    process.env.CORS_ORIGIN = "http://localhost:5173";
    process.env.ENCRYPTION_KEY = "k";
    process.env.SDK_JWT_SECRET = "sdk-secret";
  };

  afterEach(() => {
    if (originalJwt !== undefined) process.env.JWT_SECRET = originalJwt;
    else delete process.env.JWT_SECRET;
    if (originalCors !== undefined) process.env.CORS_ORIGIN = originalCors;
    else delete process.env.CORS_ORIGIN;
    if (originalEnc !== undefined) process.env.ENCRYPTION_KEY = originalEnc;
    else delete process.env.ENCRYPTION_KEY;
    if (originalSdk !== undefined) process.env.SDK_JWT_SECRET = originalSdk;
    else delete process.env.SDK_JWT_SECRET;
  });

  it("throws when JWT_SECRET is not set", () => {
    setAllRequired();
    delete process.env.JWT_SECRET;

    expect(() => loadConfig()).toThrow("JWT_SECRET");
  });

  it("throws when CORS_ORIGIN is not set", () => {
    setAllRequired();
    delete process.env.CORS_ORIGIN;

    expect(() => loadConfig()).toThrow("CORS_ORIGIN");
  });

  it("throws when ENCRYPTION_KEY is not set", () => {
    setAllRequired();
    delete process.env.ENCRYPTION_KEY;

    expect(() => loadConfig()).toThrow("ENCRYPTION_KEY");
  });

  it("throws when SDK_JWT_SECRET is not set", () => {
    setAllRequired();
    delete process.env.SDK_JWT_SECRET;

    expect(() => loadConfig()).toThrow("SDK_JWT_SECRET");
  });

  it("loads config when required vars are set", () => {
    setAllRequired();
    process.env.JWT_SECRET = "my-secret";

    const config = loadConfig();

    expect(config.jwt.secret).toBe("my-secret");
  });

  it("exposes the SDK JWT secret separately from the admin JWT secret", () => {
    setAllRequired();
    process.env.JWT_SECRET = "admin-only";
    process.env.SDK_JWT_SECRET = "sdk-only";

    const config = loadConfig();

    expect(config.sdkJwt.secret).toBe("sdk-only");
  });
});
