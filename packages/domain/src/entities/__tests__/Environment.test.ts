import { describe, it, expect } from "vitest";
import { createEnvironment, updateEnvironment } from "../Environment.js";

const validEnvParams = {
  id: "env-1",
  appId: "app-1",
  name: "Production",
  key: "prod",
};

describe("createEnvironment", () => {
  it("stores id wrapper with the provided value", () => {
    const env = createEnvironment(validEnvParams);
    expect(env.id.value).toBe("env-1");
  });

  it("stores the appId", () => {
    const env = createEnvironment(validEnvParams);
    expect(env.appId).toBe("app-1");
  });

  it("stores the name", () => {
    const env = createEnvironment(validEnvParams);
    expect(env.name).toBe("Production");
  });

  it("trims surrounding whitespace from name", () => {
    const env = createEnvironment({ ...validEnvParams, name: "  Prod  " });
    expect(env.name).toBe("Prod");
  });

  it("stores the key as-is", () => {
    const env = createEnvironment(validEnvParams);
    expect(env.key).toBe("prod");
  });

  it("defaults cacheTtlSeconds to 300 when omitted", () => {
    const env = createEnvironment(validEnvParams);
    expect(env.cacheTtlSeconds).toBe(300);
  });

  it("accepts a custom cacheTtlSeconds", () => {
    const env = createEnvironment({ ...validEnvParams, cacheTtlSeconds: 60 });
    expect(env.cacheTtlSeconds).toBe(60);
  });

  it("accepts cacheTtlSeconds of exactly 0 (no caching)", () => {
    const env = createEnvironment({ ...validEnvParams, cacheTtlSeconds: 0 });
    expect(env.cacheTtlSeconds).toBe(0);
  });

  it("accepts cacheTtlSeconds of exactly 86400 (24h max)", () => {
    const env = createEnvironment({ ...validEnvParams, cacheTtlSeconds: 86400 });
    expect(env.cacheTtlSeconds).toBe(86400);
  });

  it("rejects cacheTtlSeconds of -1", () => {
    expect(() =>
      createEnvironment({ ...validEnvParams, cacheTtlSeconds: -1 })
    ).toThrow("Cache TTL must be between 0 and 86400");
  });

  it("rejects cacheTtlSeconds of 86401 (just over max)", () => {
    expect(() =>
      createEnvironment({ ...validEnvParams, cacheTtlSeconds: 86401 })
    ).toThrow("Cache TTL must be between 0 and 86400");
  });

  it("rejects an empty name", () => {
    expect(() =>
      createEnvironment({ ...validEnvParams, name: "" })
    ).toThrow("Environment name cannot be empty");
  });

  it("rejects a whitespace-only name", () => {
    expect(() =>
      createEnvironment({ ...validEnvParams, name: "   " })
    ).toThrow("Environment name cannot be empty");
  });

  it("rejects a key starting with a hyphen", () => {
    expect(() =>
      createEnvironment({ ...validEnvParams, key: "-dev" })
    ).toThrow("Environment key must be lowercase");
  });

  it("rejects a key ending with a hyphen", () => {
    expect(() =>
      createEnvironment({ ...validEnvParams, key: "dev-" })
    ).toThrow("Environment key must be lowercase");
  });

  it("rejects a key with uppercase letters", () => {
    expect(() =>
      createEnvironment({ ...validEnvParams, key: "Prod" })
    ).toThrow("Environment key must be lowercase");
  });

  it("rejects a key containing a trailing invalid char", () => {
    expect(() =>
      createEnvironment({ ...validEnvParams, key: "prod!" })
    ).toThrow("Environment key must be lowercase");
  });

  it("sets createdAt to a Date instance", () => {
    const env = createEnvironment(validEnvParams);
    expect(env.createdAt).toBeInstanceOf(Date);
  });
});

describe("updateEnvironment", () => {
  const base = createEnvironment(validEnvParams);

  it("updates cacheTtlSeconds to a new value", () => {
    const updated = updateEnvironment(base, { cacheTtlSeconds: 120 });
    expect(updated.cacheTtlSeconds).toBe(120);
  });

  it("preserves name when only TTL changes", () => {
    const updated = updateEnvironment(base, { cacheTtlSeconds: 120 });
    expect(updated.name).toBe("Production");
  });

  it("updates the name", () => {
    const updated = updateEnvironment(base, { name: "Prod-updated" });
    expect(updated.name).toBe("Prod-updated");
  });

  it("trims whitespace when updating the name", () => {
    const updated = updateEnvironment(base, { name: "  Trimmed  " });
    expect(updated.name).toBe("Trimmed");
  });

  it("preserves TTL when only name changes", () => {
    const updated = updateEnvironment(base, { name: "Prod-updated" });
    expect(updated.cacheTtlSeconds).toBe(300);
  });

  it("rejects an empty new name", () => {
    expect(() => updateEnvironment(base, { name: "" })).toThrow(
      "Environment name cannot be empty"
    );
  });

  it("rejects a whitespace-only new name", () => {
    expect(() => updateEnvironment(base, { name: "   " })).toThrow(
      "Environment name cannot be empty"
    );
  });

  it("rejects a negative TTL on update", () => {
    expect(() => updateEnvironment(base, { cacheTtlSeconds: -1 })).toThrow(
      "Cache TTL must be between 0 and 86400"
    );
  });

  it("rejects a TTL of 86401 on update", () => {
    expect(() => updateEnvironment(base, { cacheTtlSeconds: 86401 })).toThrow(
      "Cache TTL must be between 0 and 86400"
    );
  });

  it("accepts a TTL of exactly 0 on update", () => {
    const updated = updateEnvironment(base, { cacheTtlSeconds: 0 });
    expect(updated.cacheTtlSeconds).toBe(0);
  });

  it("accepts a TTL of exactly 86400 on update", () => {
    const updated = updateEnvironment(base, { cacheTtlSeconds: 86400 });
    expect(updated.cacheTtlSeconds).toBe(86400);
  });

  it("returns base unchanged when no updates are passed", () => {
    const updated = updateEnvironment(base, {});
    expect(updated.name).toBe(base.name);
  });
});
