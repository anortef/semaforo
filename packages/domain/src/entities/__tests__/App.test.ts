import { describe, it, expect } from "vitest";
import { createApp } from "../App.js";

const validAppParams = {
  id: "app-1",
  name: "My App",
  key: "my-app",
  description: "Test app",
};

describe("createApp", () => {
  it("stores id wrapper with the provided value", () => {
    const app = createApp(validAppParams);
    expect(app.id.value).toBe("app-1");
  });

  it("stores the name", () => {
    const app = createApp(validAppParams);
    expect(app.name).toBe("My App");
  });

  it("trims surrounding whitespace from name", () => {
    const app = createApp({ ...validAppParams, name: "  Padded  " });
    expect(app.name).toBe("Padded");
  });

  it("stores the key as-is", () => {
    const app = createApp(validAppParams);
    expect(app.key).toBe("my-app");
  });

  it("stores the description", () => {
    const app = createApp(validAppParams);
    expect(app.description).toBe("Test app");
  });

  it("defaults description to empty string when omitted", () => {
    const app = createApp({ id: "1", name: "Test", key: "test-app" });
    expect(app.description).toBe("");
  });

  it("sets createdAt to a Date instance", () => {
    const app = createApp(validAppParams);
    expect(app.createdAt).toBeInstanceOf(Date);
  });

  it("rejects an empty name", () => {
    expect(() => createApp({ ...validAppParams, name: "" })).toThrow(
      "App name cannot be empty"
    );
  });

  it("rejects a whitespace-only name", () => {
    expect(() => createApp({ ...validAppParams, name: "   " })).toThrow(
      "App name cannot be empty"
    );
  });

  it("rejects a key starting with a hyphen", () => {
    expect(() => createApp({ ...validAppParams, key: "-invalid" })).toThrow(
      "App key must be lowercase"
    );
  });

  it("rejects a key ending with a hyphen", () => {
    expect(() => createApp({ ...validAppParams, key: "invalid-" })).toThrow(
      "App key must be lowercase"
    );
  });

  it("rejects a key with uppercase letters", () => {
    expect(() => createApp({ ...validAppParams, key: "MyApp" })).toThrow(
      "App key must be lowercase"
    );
  });

  it("rejects a key with a trailing invalid character", () => {
    expect(() => createApp({ ...validAppParams, key: "my-app!" })).toThrow(
      "App key must be lowercase"
    );
  });

  it("accepts a two-character lowercase key", () => {
    const app = createApp({ ...validAppParams, key: "ab" });
    expect(app.key).toBe("ab");
  });
});
