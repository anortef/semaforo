import { describe, it, expect } from "vitest";
import { createFeatureToggle } from "../FeatureToggle.js";

describe("FeatureToggle", () => {
  it("creates a valid toggle", () => {
    const toggle = createFeatureToggle({
      id: "toggle-1",
      appId: "app-1",
      name: "New Checkout",
      key: "newCheckout",
    });

    expect(toggle.key).toBe("newCheckout");
  });

  it("defaults type to boolean", () => {
    const toggle = createFeatureToggle({
      id: "1",
      appId: "a",
      name: "Test",
      key: "test",
    });

    expect(toggle.type).toBe("boolean");
  });

  it("accepts string type", () => {
    const toggle = createFeatureToggle({
      id: "1",
      appId: "a",
      name: "Banner Message",
      key: "bannerMessage",
      type: "string",
    });

    expect(toggle.type).toBe("string");
  });

  it("rejects invalid type", () => {
    expect(() =>
      createFeatureToggle({
        id: "1",
        appId: "a",
        name: "Test",
        key: "test",
        type: "number" as "boolean",
      })
    ).toThrow("Invalid toggle type");
  });

  it("rejects empty name", () => {
    expect(() =>
      createFeatureToggle({ id: "1", appId: "a", name: "", key: "valid" })
    ).toThrow("Toggle name cannot be empty");
  });

  it("rejects key with hyphens", () => {
    expect(() =>
      createFeatureToggle({ id: "1", appId: "a", name: "Test", key: "new-checkout" })
    ).toThrow("Toggle key must be camelCase");
  });
});
