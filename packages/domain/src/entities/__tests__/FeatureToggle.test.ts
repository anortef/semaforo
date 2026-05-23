import { describe, it, expect } from "vitest";
import { createFeatureToggle } from "../FeatureToggle.js";

const validToggleParams = {
  id: "toggle-1",
  appId: "app-1",
  name: "New Checkout",
  key: "newCheckout",
};

describe("createFeatureToggle", () => {
  it("stores id wrapper with the provided value", () => {
    const toggle = createFeatureToggle(validToggleParams);
    expect(toggle.id.value).toBe("toggle-1");
  });

  it("stores the appId", () => {
    const toggle = createFeatureToggle(validToggleParams);
    expect(toggle.appId).toBe("app-1");
  });

  it("stores the name", () => {
    const toggle = createFeatureToggle(validToggleParams);
    expect(toggle.name).toBe("New Checkout");
  });

  it("trims surrounding whitespace from name", () => {
    const toggle = createFeatureToggle({ ...validToggleParams, name: "  Checkout  " });
    expect(toggle.name).toBe("Checkout");
  });

  it("stores the key as-is", () => {
    const toggle = createFeatureToggle(validToggleParams);
    expect(toggle.key).toBe("newCheckout");
  });

  it("defaults type to 'boolean' when omitted", () => {
    const toggle = createFeatureToggle(validToggleParams);
    expect(toggle.type).toBe("boolean");
  });

  it("accepts 'string' as an explicit type", () => {
    const toggle = createFeatureToggle({ ...validToggleParams, type: "string" });
    expect(toggle.type).toBe("string");
  });

  it("accepts 'boolean' as an explicit type", () => {
    const toggle = createFeatureToggle({ ...validToggleParams, type: "boolean" });
    expect(toggle.type).toBe("boolean");
  });

  it("rejects an unknown type", () => {
    expect(() =>
      createFeatureToggle({ ...validToggleParams, type: "number" as "boolean" })
    ).toThrow("Invalid toggle type");
  });

  it("defaults description to empty string when omitted", () => {
    const toggle = createFeatureToggle(validToggleParams);
    expect(toggle.description).toBe("");
  });

  it("stores a non-empty description verbatim", () => {
    const toggle = createFeatureToggle({ ...validToggleParams, description: "Rolls out new checkout" });
    expect(toggle.description).toBe("Rolls out new checkout");
  });

  it("stores an explicitly-empty description as empty string", () => {
    const toggle = createFeatureToggle({ ...validToggleParams, description: "" });
    expect(toggle.description).toBe("");
  });

  it("rejects an empty name", () => {
    expect(() =>
      createFeatureToggle({ ...validToggleParams, name: "" })
    ).toThrow("Toggle name cannot be empty");
  });

  it("rejects a whitespace-only name", () => {
    expect(() =>
      createFeatureToggle({ ...validToggleParams, name: "   " })
    ).toThrow("Toggle name cannot be empty");
  });

  it("rejects a key containing hyphens", () => {
    expect(() =>
      createFeatureToggle({ ...validToggleParams, key: "new-checkout" })
    ).toThrow("Toggle key must be camelCase");
  });

  it("rejects a key starting with a digit", () => {
    expect(() =>
      createFeatureToggle({ ...validToggleParams, key: "1stCheckout" })
    ).toThrow("Toggle key must be camelCase");
  });

  it("sets createdAt to a Date instance", () => {
    const toggle = createFeatureToggle(validToggleParams);
    expect(toggle.createdAt).toBeInstanceOf(Date);
  });
});
