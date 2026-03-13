import { describe, it, expect } from "vitest";
import { createEnvironment, updateEnvironment } from "../Environment.js";

describe("Environment", () => {
  it("creates a valid environment with default TTL", () => {
    const env = createEnvironment({
      id: "env-1",
      appId: "app-1",
      name: "Production",
      key: "prod",
    });

    expect(env.id.value).toBe("env-1");
    expect(env.name).toBe("Production");
    expect(env.key).toBe("prod");
    expect(env.cacheTtlSeconds).toBe(300);
  });

  it("creates with custom TTL", () => {
    const env = createEnvironment({
      id: "env-1",
      appId: "app-1",
      name: "Dev",
      key: "dev",
      cacheTtlSeconds: 60,
    });
    expect(env.cacheTtlSeconds).toBe(60);
  });

  it("allows TTL of 0 (no caching)", () => {
    const env = createEnvironment({
      id: "env-1",
      appId: "app-1",
      name: "Dev",
      key: "dev",
      cacheTtlSeconds: 0,
    });
    expect(env.cacheTtlSeconds).toBe(0);
  });

  it("rejects TTL over 86400", () => {
    expect(() =>
      createEnvironment({
        id: "1",
        appId: "a",
        name: "Dev",
        key: "dev",
        cacheTtlSeconds: 100000,
      })
    ).toThrow("Cache TTL must be between 0 and 86400");
  });

  it("rejects empty name", () => {
    expect(() =>
      createEnvironment({ id: "1", appId: "a", name: "", key: "dev" })
    ).toThrow("Environment name cannot be empty");
  });

  it("rejects invalid key", () => {
    expect(() =>
      createEnvironment({ id: "1", appId: "a", name: "Dev", key: "-dev" })
    ).toThrow("Environment key must be lowercase");
  });

  describe("updateEnvironment", () => {
    it("updates TTL", () => {
      const env = createEnvironment({
        id: "1",
        appId: "a",
        name: "Prod",
        key: "prod",
      });
      const updated = updateEnvironment(env, { cacheTtlSeconds: 120 });
      expect(updated.cacheTtlSeconds).toBe(120);
      expect(updated.name).toBe("Prod");
    });

    it("updates name", () => {
      const env = createEnvironment({
        id: "1",
        appId: "a",
        name: "Prod",
        key: "prod",
      });
      const updated = updateEnvironment(env, { name: "Production" });
      expect(updated.name).toBe("Production");
      expect(updated.cacheTtlSeconds).toBe(300);
    });

    it("rejects invalid TTL on update", () => {
      const env = createEnvironment({
        id: "1",
        appId: "a",
        name: "Prod",
        key: "prod",
      });
      expect(() => updateEnvironment(env, { cacheTtlSeconds: -1 })).toThrow(
        "Cache TTL must be between 0 and 86400"
      );
    });
  });
});
