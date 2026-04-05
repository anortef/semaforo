import { describe, it, expect } from "vitest";
import { createUser } from "../User.js";

describe("User", () => {
  it("creates a valid user with default role", () => {
    const user = createUser({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed",
    });

    expect(user.id.value).toBe("user-1");
    expect(user.email).toBe("test@example.com");
    expect(user.name).toBe("Test User");
    expect(user.role).toBe("user");
  });

  it("creates a user with admin role", () => {
    const user = createUser({
      id: "user-2",
      email: "admin@example.com",
      name: "Admin",
      passwordHash: "hashed",
      role: "admin",
    });

    expect(user.role).toBe("admin");
  });

  it("creates a user with explicit user role", () => {
    const user = createUser({
      id: "user-3",
      email: "regular@example.com",
      name: "Regular",
      passwordHash: "hashed",
      role: "user",
    });

    expect(user.role).toBe("user");
  });

  it("rejects invalid role", () => {
    expect(() =>
      createUser({
        id: "1",
        email: "a@b.com",
        name: "Test",
        passwordHash: "h",
        role: "superadmin" as "admin",
      })
    ).toThrow("Invalid role");
  });

  it("lowercases email", () => {
    const user = createUser({
      id: "1",
      email: "Test@Example.COM",
      name: "Test",
      passwordHash: "h",
    });
    expect(user.email).toBe("test@example.com");
  });

  it("rejects invalid email", () => {
    expect(() =>
      createUser({ id: "1", email: "invalid", name: "Test", passwordHash: "h" })
    ).toThrow("Invalid email");
  });

  it("rejects empty name", () => {
    expect(() =>
      createUser({ id: "1", email: "a@b.com", name: "  ", passwordHash: "h" })
    ).toThrow("Name cannot be empty");
  });
});
