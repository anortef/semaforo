import { describe, it, expect } from "vitest";
import { createSystemSetting } from "../SystemSetting.js";

describe("SystemSetting", () => {
  it("creates a valid system setting", () => {
    const setting = createSystemSetting({
      id: "s-1",
      key: "publicDomain",
      value: "https://example.com",
    });

    expect(setting.key).toBe("publicDomain");
  });

  it("stores the value", () => {
    const setting = createSystemSetting({
      id: "s-1",
      key: "publicDomain",
      value: "https://example.com",
    });

    expect(setting.value).toBe("https://example.com");
  });

  it("rejects empty key", () => {
    expect(() =>
      createSystemSetting({ id: "1", key: "", value: "v" })
    ).toThrow("key cannot be empty");
  });

  it("rejects empty value", () => {
    expect(() =>
      createSystemSetting({ id: "1", key: "k", value: "" })
    ).toThrow("value cannot be empty");
  });
});
