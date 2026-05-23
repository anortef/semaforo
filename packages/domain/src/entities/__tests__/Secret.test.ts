import { describe, it, expect } from "vitest";
import { createSecret } from "../Secret.js";

const validSecretParams = {
  id: "secret-1",
  appId: "app-1",
  key: "databasePassword",
};

describe("createSecret", () => {
  it("stores id wrapper with the provided value", () => {
    const secret = createSecret(validSecretParams);
    expect(secret.id.value).toBe("secret-1");
  });

  it("stores the appId", () => {
    const secret = createSecret(validSecretParams);
    expect(secret.appId).toBe("app-1");
  });

  it("stores the key", () => {
    const secret = createSecret(validSecretParams);
    expect(secret.key).toBe("databasePassword");
  });

  it("defaults description to empty string when omitted", () => {
    const secret = createSecret(validSecretParams);
    expect(secret.description).toBe("");
  });

  it("stores a non-empty description verbatim", () => {
    const secret = createSecret({ ...validSecretParams, description: "Third-party API token" });
    expect(secret.description).toBe("Third-party API token");
  });

  it("sets createdAt to a Date instance", () => {
    const secret = createSecret(validSecretParams);
    expect(secret.createdAt).toBeInstanceOf(Date);
  });

  it("rejects a key containing hyphens", () => {
    expect(() =>
      createSecret({ ...validSecretParams, key: "database-password" })
    ).toThrow("Secret key must be camelCase");
  });

  it("rejects a key starting with a digit", () => {
    expect(() =>
      createSecret({ ...validSecretParams, key: "1password" })
    ).toThrow("Secret key must be camelCase");
  });

  it("rejects a key containing spaces", () => {
    expect(() =>
      createSecret({ ...validSecretParams, key: "my secret" })
    ).toThrow("Secret key must be camelCase");
  });
});
