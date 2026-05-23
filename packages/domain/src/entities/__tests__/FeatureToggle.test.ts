import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createFeatureToggle } from "../FeatureToggle.js";
import {
  camelCaseKey,
  invalidCamelCaseKey,
  nonEmptyName,
} from "../../test/arbitraries.js";

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

describe("FeatureToggle properties", () => {
  it("preserves the id verbatim: toggle.id.value === params.id for any id", () => {
    fc.assert(
      fc.property(fc.string(), (id) => {
        const toggle = createFeatureToggle({ ...validToggleParams, id });
        return toggle.id.value === id;
      }),
    );
  });

  it("stores the name trimmed regardless of surrounding whitespace", () => {
    fc.assert(
      fc.property(nonEmptyName(), fc.nat({ max: 5 }), fc.nat({ max: 5 }), (name, lead, trail) => {
        const padded = " ".repeat(lead) + name + " ".repeat(trail);
        const toggle = createFeatureToggle({ ...validToggleParams, name: padded });
        return toggle.name === name.trim();
      }),
    );
  });

  it("accepts any key that matches the camelCase pattern", () => {
    fc.assert(
      fc.property(camelCaseKey(), (key) => {
        const toggle = createFeatureToggle({ ...validToggleParams, key });
        return toggle.key === key;
      }),
    );
  });

  it("rejects any key that does not match the camelCase pattern", () => {
    fc.assert(
      fc.property(invalidCamelCaseKey(), (key) => {
        let threw = false;
        try {
          createFeatureToggle({ ...validToggleParams, key });
        } catch {
          threw = true;
        }
        return threw;
      }),
    );
  });

  it("only accepts the two declared types", () => {
    fc.assert(
      fc.property(fc.constantFrom("boolean" as const, "string" as const), (type) => {
        const toggle = createFeatureToggle({ ...validToggleParams, type });
        return toggle.type === type;
      }),
    );
  });

  it("rejects any type outside the declared set", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s !== "boolean" && s !== "string"),
        (type) => {
          let threw = false;
          try {
            createFeatureToggle({ ...validToggleParams, type: type as "boolean" });
          } catch {
            threw = true;
          }
          return threw;
        },
      ),
    );
  });

  it("preserves the description verbatim for any string", () => {
    fc.assert(
      fc.property(fc.string(), (description) => {
        const toggle = createFeatureToggle({ ...validToggleParams, description });
        return toggle.description === description;
      }),
    );
  });
});
