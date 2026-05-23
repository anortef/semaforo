import { describe, it, expect } from "vitest";
import { createApiKey } from "../ApiKey.js";

const validApiKeyParams = {
  id: "key-1",
  environmentId: "env-1",
  name: "Production Key",
  key: "sk_abc123def456",
};

describe("createApiKey", () => {
  it("stores id wrapper with the provided value", () => {
    const key = createApiKey(validApiKeyParams);
    expect(key.id.value).toBe("key-1");
  });

  it("stores the environmentId", () => {
    const key = createApiKey(validApiKeyParams);
    expect(key.environmentId).toBe("env-1");
  });

  it("stores the name", () => {
    const key = createApiKey(validApiKeyParams);
    expect(key.name).toBe("Production Key");
  });

  it("trims surrounding whitespace from name", () => {
    const key = createApiKey({ ...validApiKeyParams, name: "  Trimmed  " });
    expect(key.name).toBe("Trimmed");
  });

  it("stores the key value", () => {
    const key = createApiKey(validApiKeyParams);
    expect(key.key).toBe("sk_abc123def456");
  });

  it("sets createdAt to a Date instance", () => {
    const key = createApiKey(validApiKeyParams);
    expect(key.createdAt).toBeInstanceOf(Date);
  });

  it("rejects an empty name", () => {
    expect(() =>
      createApiKey({ ...validApiKeyParams, name: "" })
    ).toThrow("API key name cannot be empty");
  });

  it("rejects a whitespace-only name", () => {
    expect(() =>
      createApiKey({ ...validApiKeyParams, name: "  " })
    ).toThrow("API key name cannot be empty");
  });

  it("rejects an empty key", () => {
    expect(() =>
      createApiKey({ ...validApiKeyParams, key: "" })
    ).toThrow("API key value cannot be empty");
  });
});
