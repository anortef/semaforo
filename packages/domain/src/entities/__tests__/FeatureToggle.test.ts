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

    expect(toggle.id.value).toBe("toggle-1");
    expect(toggle.appId).toBe("app-1");
    expect(toggle.key).toBe("newCheckout");
  });

  it("rejects empty name", () => {
    expect(() =>
      createFeatureToggle({ id: "1", appId: "a", name: "", key: "valid" })
    ).toThrow("Toggle name cannot be empty");
  });

  it("rejects key starting with number", () => {
    expect(() =>
      createFeatureToggle({ id: "1", appId: "a", name: "Test", key: "1invalid" })
    ).toThrow("Toggle key must be camelCase");
  });

  it("rejects key with hyphens", () => {
    expect(() =>
      createFeatureToggle({ id: "1", appId: "a", name: "Test", key: "new-checkout" })
    ).toThrow("Toggle key must be camelCase");
  });
});
