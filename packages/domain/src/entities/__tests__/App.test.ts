import { describe, it, expect } from "vitest";
import { createApp } from "../App.js";

describe("App", () => {
  it("creates a valid app", () => {
    const app = createApp({
      id: "app-1",
      name: "My App",
      key: "my-app",
      description: "Test app",
    });

    expect(app.id.value).toBe("app-1");
    expect(app.name).toBe("My App");
    expect(app.key).toBe("my-app");
    expect(app.description).toBe("Test app");
    expect(app.createdAt).toBeInstanceOf(Date);
  });

  it("rejects empty name", () => {
    expect(() =>
      createApp({ id: "1", name: "", key: "valid-key" })
    ).toThrow("App name cannot be empty");
  });

  it("rejects invalid key format", () => {
    expect(() =>
      createApp({ id: "1", name: "Test", key: "-invalid" })
    ).toThrow("App key must be lowercase");
  });

  it("rejects key with uppercase", () => {
    expect(() =>
      createApp({ id: "1", name: "Test", key: "MyApp" })
    ).toThrow("App key must be lowercase");
  });

  it("defaults description to empty string", () => {
    const app = createApp({ id: "1", name: "Test", key: "test-app" });
    expect(app.description).toBe("");
  });
});
