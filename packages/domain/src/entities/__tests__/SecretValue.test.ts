import { describe, it, expect } from "vitest";
import { createSecretValue, updateSecretValue } from "../SecretValue.js";

describe("SecretValue", () => {
  it("defaults encryptedValue to empty string", () => {
    const value = createSecretValue({
      id: "sv-1",
      secretId: "s-1",
      environmentId: "e-1",
    });

    expect(value.encryptedValue).toBe("");
  });

  it("can be created with an encrypted value", () => {
    const value = createSecretValue({
      id: "sv-1",
      secretId: "s-1",
      environmentId: "e-1",
      encryptedValue: "base64encrypteddata",
    });

    expect(value.encryptedValue).toBe("base64encrypteddata");
  });

  it("can update encrypted value", () => {
    const original = createSecretValue({
      id: "sv-1",
      secretId: "s-1",
      environmentId: "e-1",
      encryptedValue: "old",
    });
    const updated = updateSecretValue(original, { encryptedValue: "new" });

    expect(updated.encryptedValue).toBe("new");
    expect(updated.id).toEqual(original.id);
    expect(updated.secretId).toBe(original.secretId);
    expect(updated.environmentId).toBe(original.environmentId);
  });

  it("updates updatedAt on change", () => {
    const original = createSecretValue({
      id: "sv-1",
      secretId: "s-1",
      environmentId: "e-1",
      encryptedValue: "old",
    });

    const before = Date.now();
    const updated = updateSecretValue(original, { encryptedValue: "new" });

    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
