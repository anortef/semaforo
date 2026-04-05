import { describe, it, expect } from "vitest";
import { createUser, updateUser } from "../User.js";

describe("createUser", () => {
  it("defaults role to user", () => {
    const user = createUser({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed",
    });

    expect(user.role).toBe("user");
  });

  it("defaults disabled to false", () => {
    const user = createUser({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed",
    });

    expect(user.disabled).toBe(false);
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

describe("updateUser", () => {
  const base = createUser({
    id: "user-1",
    email: "test@example.com",
    name: "Test",
    passwordHash: "h",
    role: "user",
  });

  it("updates the name", () => {
    const updated = updateUser(base, { name: "New Name" });

    expect(updated.name).toBe("New Name");
  });

  it("updates the role", () => {
    const updated = updateUser(base, { role: "admin" });

    expect(updated.role).toBe("admin");
  });

  it("updates disabled status", () => {
    const updated = updateUser(base, { disabled: true });

    expect(updated.disabled).toBe(true);
  });

  it("updates the password hash", () => {
    const updated = updateUser(base, { passwordHash: "new-hash" });

    expect(updated.passwordHash).toBe("new-hash");
  });

  it("preserves unchanged fields", () => {
    const updated = updateUser(base, { name: "New" });

    expect(updated.email).toBe("test@example.com");
  });

  it("sets updatedAt to current time", () => {
    const before = new Date();
    const updated = updateUser(base, { name: "New" });

    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});
