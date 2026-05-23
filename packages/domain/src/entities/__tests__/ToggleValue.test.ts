import { describe, it, expect } from "vitest";
import { createToggleValue, updateToggleValue } from "../ToggleValue.js";

const validTvParams = {
  id: "tv-1",
  toggleId: "t-1",
  environmentId: "e-1",
};

describe("createToggleValue", () => {
  it("stores id wrapper with the provided value", () => {
    const value = createToggleValue(validTvParams);
    expect(value.id.value).toBe("tv-1");
  });

  it("stores the toggleId", () => {
    const value = createToggleValue(validTvParams);
    expect(value.toggleId).toBe("t-1");
  });

  it("stores the environmentId", () => {
    const value = createToggleValue(validTvParams);
    expect(value.environmentId).toBe("e-1");
  });

  it("defaults enabled to false when omitted", () => {
    const value = createToggleValue(validTvParams);
    expect(value.enabled).toBe(false);
  });

  it("accepts enabled = true", () => {
    const value = createToggleValue({ ...validTvParams, enabled: true });
    expect(value.enabled).toBe(true);
  });

  it("defaults stringValue to empty string when omitted", () => {
    const value = createToggleValue(validTvParams);
    expect(value.stringValue).toBe("");
  });

  it("stores a provided stringValue verbatim", () => {
    const value = createToggleValue({ ...validTvParams, stringValue: "Hello World" });
    expect(value.stringValue).toBe("Hello World");
  });

  it("defaults rolloutPercentage to 100 when omitted", () => {
    const value = createToggleValue(validTvParams);
    expect(value.rolloutPercentage).toBe(100);
  });

  it("stores a provided rolloutPercentage within range", () => {
    const value = createToggleValue({ ...validTvParams, rolloutPercentage: 50 });
    expect(value.rolloutPercentage).toBe(50);
  });

  it("clamps a rolloutPercentage above 100 down to 100", () => {
    const value = createToggleValue({ ...validTvParams, rolloutPercentage: 150 });
    expect(value.rolloutPercentage).toBe(100);
  });

  it("clamps a rolloutPercentage below 0 up to 0", () => {
    const value = createToggleValue({ ...validTvParams, rolloutPercentage: -10 });
    expect(value.rolloutPercentage).toBe(0);
  });

  it("sets updatedAt to a Date instance", () => {
    const value = createToggleValue(validTvParams);
    expect(value.updatedAt).toBeInstanceOf(Date);
  });
});

describe("updateToggleValue", () => {
  const original = createToggleValue({
    ...validTvParams,
    enabled: true,
    stringValue: "hi",
    rolloutPercentage: 80,
  });

  it("updates enabled from true to false", () => {
    const updated = updateToggleValue(original, { enabled: false });
    expect(updated.enabled).toBe(false);
  });

  it("updates enabled from false to true", () => {
    const disabled = createToggleValue({ ...validTvParams, enabled: false });
    const updated = updateToggleValue(disabled, { enabled: true });
    expect(updated.enabled).toBe(true);
  });

  it("updates stringValue", () => {
    const updated = updateToggleValue(original, { stringValue: "new message" });
    expect(updated.stringValue).toBe("new message");
  });

  it("updates rolloutPercentage to a value within range", () => {
    const updated = updateToggleValue(original, { rolloutPercentage: 25 });
    expect(updated.rolloutPercentage).toBe(25);
  });

  it("clamps an updated rolloutPercentage above 100 to 100", () => {
    const updated = updateToggleValue(original, { rolloutPercentage: 250 });
    expect(updated.rolloutPercentage).toBe(100);
  });

  it("clamps an updated rolloutPercentage below 0 to 0", () => {
    const updated = updateToggleValue(original, { rolloutPercentage: -5 });
    expect(updated.rolloutPercentage).toBe(0);
  });

  it("preserves stringValue when only enabled changes", () => {
    const updated = updateToggleValue(original, { enabled: false });
    expect(updated.stringValue).toBe("hi");
  });

  it("preserves rolloutPercentage when only enabled changes", () => {
    const updated = updateToggleValue(original, { enabled: false });
    expect(updated.rolloutPercentage).toBe(80);
  });

  it("preserves the id when updating", () => {
    const updated = updateToggleValue(original, { enabled: false });
    expect(updated.id.value).toBe("tv-1");
  });

  it("sets updatedAt to at-or-after the call moment", () => {
    const before = Date.now();
    const updated = updateToggleValue(original, { enabled: false });
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
