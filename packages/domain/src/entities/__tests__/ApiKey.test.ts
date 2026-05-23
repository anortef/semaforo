import { describe, it, expect } from "vitest";
import { createApiKey } from "../ApiKey.js";

const validApiKeyParams = {
  id: "key-1",
  environmentId: "env-1",
  name: "Production Key",
  keyHash: "deadbeef".repeat(8),
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

  it("stores the keyHash verbatim", () => {
    const key = createApiKey(validApiKeyParams);
    expect(key.keyHash).toBe(validApiKeyParams.keyHash);
  });

  it("never exposes a plaintext `key` field on the entity", () => {
    const key = createApiKey(validApiKeyParams);
    expect("key" in key).toBe(false);
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

  it("rejects an empty keyHash", () => {
    expect(() =>
      createApiKey({ ...validApiKeyParams, keyHash: "" })
    ).toThrow("API key hash cannot be empty");
  });
});
