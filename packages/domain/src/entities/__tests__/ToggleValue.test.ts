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

  it("defaults stringValue to empty string", () => {
    const value = createToggleValue({
      id: "tv-1",
      toggleId: "t-1",
      environmentId: "e-1",
    });

    expect(value.stringValue).toBe("");
  });

  it("can be created with a string value", () => {
    const value = createToggleValue({
      id: "tv-1",
      toggleId: "t-1",
      environmentId: "e-1",
      stringValue: "Hello World",
    });

    expect(value.stringValue).toBe("Hello World");
  });

  it("can update enabled state", () => {
    const original = createToggleValue({ id: "tv-1", toggleId: "t-1", environmentId: "e-1" });
    const updated = updateToggleValue(original, { enabled: true });

    expect(updated.enabled).toBe(true);
  });

  it("can update string value", () => {
    const original = createToggleValue({ id: "tv-1", toggleId: "t-1", environmentId: "e-1" });
    const updated = updateToggleValue(original, { stringValue: "new message" });

    expect(updated.stringValue).toBe("new message");
  });

  it("preserves unchanged fields on update", () => {
    const original = createToggleValue({ id: "tv-1", toggleId: "t-1", environmentId: "e-1", enabled: true, stringValue: "hi" });
    const updated = updateToggleValue(original, { enabled: false });

    expect(updated.stringValue).toBe("hi");
  });
});
