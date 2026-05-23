import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createSecret } from "../Secret.js";
import { camelCaseKey, invalidCamelCaseKey } from "../../test/arbitraries.js";

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

describe("Secret properties", () => {
  it("preserves the id verbatim: secret.id.value === params.id for any id", () => {
    fc.assert(
      fc.property(fc.string(), (id) => {
        const secret = createSecret({ ...validSecretParams, id });
        return secret.id.value === id;
      }),
    );
  });

  it("accepts any key that matches the camelCase pattern", () => {
    fc.assert(
      fc.property(camelCaseKey(), (key) => {
        const secret = createSecret({ ...validSecretParams, key });
        return secret.key === key;
      }),
    );
  });

  it("rejects any key that does not match the camelCase pattern", () => {
    fc.assert(
      fc.property(invalidCamelCaseKey(), (key) => {
        let threw = false;
        try {
          createSecret({ ...validSecretParams, key });
        } catch {
          threw = true;
        }
        return threw;
      }),
    );
  });

  it("preserves the description verbatim for any string", () => {
    fc.assert(
      fc.property(fc.string(), (description) => {
        const secret = createSecret({ ...validSecretParams, description });
        return secret.description === description;
      }),
    );
  });
});
