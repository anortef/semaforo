import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSecurityLogger } from "../securityLogger.js";

describe("securityLogger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logs login success events", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = createSecurityLogger();

    logger.loginSuccess("user-1", "admin@test.com");

    expect(spy.mock.calls[0][0]).toContain("LOGIN_SUCCESS");
  });

  it("logs login failure events", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = createSecurityLogger();

    logger.loginFailure("unknown@test.com");

    expect(spy.mock.calls[0][0]).toContain("LOGIN_FAILURE");
  });

  it("logs unauthorized access events", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = createSecurityLogger();

    logger.unauthorizedAccess("/api/apps");

    expect(spy.mock.calls[0][0]).toContain("UNAUTHORIZED");
  });

  it("logs api key created events", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = createSecurityLogger();

    logger.apiKeyCreated("env-1", "key-1");

    expect(spy.mock.calls[0][0]).toContain("APIKEY_CREATED");
  });

  it("logs api key deleted events", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = createSecurityLogger();

    logger.apiKeyDeleted("key-1");

    expect(spy.mock.calls[0][0]).toContain("APIKEY_DELETED");
  });
});
