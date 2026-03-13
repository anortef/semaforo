import { describe, it, expect } from "vitest";
import { createEnvironment } from "../Environment.js";

describe("Environment", () => {
  it("creates a valid environment", () => {
    const env = createEnvironment({
      id: "env-1",
      appId: "app-1",
      name: "Production",
      key: "prod",
    });

    expect(env.id.value).toBe("env-1");
    expect(env.name).toBe("Production");
    expect(env.key).toBe("prod");
  });

  it("rejects empty name", () => {
    expect(() =>
      createEnvironment({ id: "1", appId: "a", name: "", key: "dev" })
    ).toThrow("Environment name cannot be empty");
  });

  it("rejects invalid key", () => {
    expect(() =>
      createEnvironment({ id: "1", appId: "a", name: "Dev", key: "-dev" })
    ).toThrow("Environment key must be lowercase");
  });
});
