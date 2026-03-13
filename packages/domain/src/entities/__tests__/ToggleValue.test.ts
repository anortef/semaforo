import { describe, it, expect } from "vitest";
import { createToggleValue, updateToggleValue } from "../ToggleValue.js";

describe("ToggleValue", () => {
  it("defaults to disabled", () => {
    const value = createToggleValue({
      id: "tv-1",
      toggleId: "t-1",
      environmentId: "e-1",
    });

    expect(value.enabled).toBe(false);
  });

  it("can be created as enabled", () => {
    const value = createToggleValue({
      id: "tv-1",
      toggleId: "t-1",
      environmentId: "e-1",
      enabled: true,
    });

    expect(value.enabled).toBe(true);
  });

  it("can be updated", () => {
    const original = createToggleValue({
      id: "tv-1",
      toggleId: "t-1",
      environmentId: "e-1",
    });

    const updated = updateToggleValue(original, true);

    expect(updated.enabled).toBe(true);
    expect(updated.id).toEqual(original.id);
    expect(updated.toggleId).toBe(original.toggleId);
  });
});
