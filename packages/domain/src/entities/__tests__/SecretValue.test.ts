import { describe, it, expect } from "vitest";
import { createSecretValue, updateSecretValue } from "../SecretValue.js";

const validSvParams = {
  id: "sv-1",
  secretId: "s-1",
  environmentId: "e-1",
};

describe("createSecretValue", () => {
  it("stores id wrapper with the provided value", () => {
    const value = createSecretValue(validSvParams);
    expect(value.id.value).toBe("sv-1");
  });

  it("stores the secretId", () => {
    const value = createSecretValue(validSvParams);
    expect(value.secretId).toBe("s-1");
  });

  it("stores the environmentId", () => {
    const value = createSecretValue(validSvParams);
    expect(value.environmentId).toBe("e-1");
  });

  it("defaults encryptedValue to empty string when omitted", () => {
    const value = createSecretValue(validSvParams);
    expect(value.encryptedValue).toBe("");
  });

  it("stores a provided encryptedValue verbatim", () => {
    const value = createSecretValue({ ...validSvParams, encryptedValue: "base64encrypteddata" });
    expect(value.encryptedValue).toBe("base64encrypteddata");
  });

  it("sets updatedAt to a Date instance", () => {
    const value = createSecretValue(validSvParams);
    expect(value.updatedAt).toBeInstanceOf(Date);
  });
});

describe("updateSecretValue", () => {
  const original = createSecretValue({ ...validSvParams, encryptedValue: "old" });

  it("replaces the encryptedValue", () => {
    const updated = updateSecretValue(original, { encryptedValue: "new" });
    expect(updated.encryptedValue).toBe("new");
  });

  it("preserves the id", () => {
    const updated = updateSecretValue(original, { encryptedValue: "new" });
    expect(updated.id.value).toBe("sv-1");
  });

  it("preserves the secretId", () => {
    const updated = updateSecretValue(original, { encryptedValue: "new" });
    expect(updated.secretId).toBe("s-1");
  });

  it("preserves the environmentId", () => {
    const updated = updateSecretValue(original, { encryptedValue: "new" });
    expect(updated.environmentId).toBe("e-1");
  });

  it("sets updatedAt to at-or-after the call moment", () => {
    const before = Date.now();
    const updated = updateSecretValue(original, { encryptedValue: "new" });
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
