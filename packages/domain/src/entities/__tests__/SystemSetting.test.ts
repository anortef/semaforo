import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createSystemSetting } from "../SystemSetting.js";
import { nonEmptyName } from "../../test/arbitraries.js";

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

describe("SystemSetting properties", () => {
  it("preserves the id verbatim: setting.id.value === params.id for any id", () => {
    fc.assert(
      fc.property(fc.string(), (id) => {
        const setting = createSystemSetting({ ...validSettingParams, id });
        return setting.id.value === id;
      }),
    );
  });

  it("stores the key trimmed regardless of surrounding whitespace", () => {
    fc.assert(
      fc.property(nonEmptyName(), fc.nat({ max: 5 }), fc.nat({ max: 5 }), (key, lead, trail) => {
        const padded = " ".repeat(lead) + key + " ".repeat(trail);
        const setting = createSystemSetting({ ...validSettingParams, key: padded });
        return setting.key === key.trim();
      }),
    );
  });

  it("preserves any non-empty value verbatim", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (value) => {
        const setting = createSystemSetting({ ...validSettingParams, value });
        return setting.value === value;
      }),
    );
  });

  it("rejects whitespace-only keys of any length", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (len) => {
        let threw = false;
        try {
          createSystemSetting({ ...validSettingParams, key: " ".repeat(len) });
        } catch {
          threw = true;
        }
        return threw;
      }),
    );
  });
});
