import { describe, it, expect } from "vitest";
import { createApiKey } from "../ApiKey.js";

describe("ApiKey", () => {
  it("creates a valid api key", () => {
    const key = createApiKey({
      id: "key-1",
      appId: "app-1",
      name: "Production Key",
      key: "sk_abc123def456",
    });

    expect(key.id.value).toBe("key-1");
    expect(key.appId).toBe("app-1");
    expect(key.name).toBe("Production Key");
    expect(key.key).toBe("sk_abc123def456");
    expect(key.createdAt).toBeInstanceOf(Date);
  });

  it("rejects empty name", () => {
    expect(() =>
      createApiKey({ id: "1", appId: "app-1", name: "  ", key: "sk_abc" })
    ).toThrow("API key name cannot be empty");
  });

  it("rejects empty key", () => {
    expect(() =>
      createApiKey({ id: "1", appId: "app-1", name: "Test", key: "" })
    ).toThrow("API key value cannot be empty");
  });
});
