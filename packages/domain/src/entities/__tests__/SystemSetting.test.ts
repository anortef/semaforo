import { describe, it, expect } from "vitest";
import { createSystemSetting } from "../SystemSetting.js";

const validSettingParams = {
  id: "s-1",
  key: "publicDomain",
  value: "https://example.com",
};

describe("createSystemSetting", () => {
  it("stores id wrapper with the provided value", () => {
    const setting = createSystemSetting(validSettingParams);
    expect(setting.id.value).toBe("s-1");
  });

  it("stores the key", () => {
    const setting = createSystemSetting(validSettingParams);
    expect(setting.key).toBe("publicDomain");
  });

  it("trims surrounding whitespace from the key", () => {
    const setting = createSystemSetting({ ...validSettingParams, key: "  publicDomain  " });
    expect(setting.key).toBe("publicDomain");
  });

  it("stores the value", () => {
    const setting = createSystemSetting(validSettingParams);
    expect(setting.value).toBe("https://example.com");
  });

  it("rejects an empty key", () => {
    expect(() =>
      createSystemSetting({ ...validSettingParams, key: "" })
    ).toThrow("Setting key cannot be empty");
  });

  it("rejects a whitespace-only key", () => {
    expect(() =>
      createSystemSetting({ ...validSettingParams, key: "   " })
    ).toThrow("Setting key cannot be empty");
  });

  it("rejects an empty value", () => {
    expect(() =>
      createSystemSetting({ ...validSettingParams, value: "" })
    ).toThrow("Setting value cannot be empty");
  });

  it("sets updatedAt to a Date instance", () => {
    const setting = createSystemSetting(validSettingParams);
    expect(setting.updatedAt).toBeInstanceOf(Date);
  });
});
