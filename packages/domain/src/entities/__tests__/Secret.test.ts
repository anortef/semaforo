import { describe, it, expect } from "vitest";
import { createSecret } from "../Secret.js";

describe("Secret", () => {
  it("creates a valid secret", () => {
    const secret = createSecret({
      id: "secret-1",
      appId: "app-1",
      key: "databasePassword",
    });

    expect(secret.key).toBe("databasePassword");
    expect(secret.description).toBe("");
  });

  it("stores optional description", () => {
    const secret = createSecret({
      id: "secret-1",
      appId: "app-1",
      key: "apiToken",
      description: "Third-party API token",
    });

    expect(secret.description).toBe("Third-party API token");
  });

  it("rejects key with hyphens", () => {
    expect(() =>
      createSecret({ id: "1", appId: "a", key: "database-password" })
    ).toThrow("Secret key must be camelCase");
  });

  it("rejects key starting with number", () => {
    expect(() =>
      createSecret({ id: "1", appId: "a", key: "1password" })
    ).toThrow("Secret key must be camelCase");
  });

  it("rejects key with spaces", () => {
    expect(() =>
      createSecret({ id: "1", appId: "a", key: "my secret" })
    ).toThrow("Secret key must be camelCase");
  });
});
