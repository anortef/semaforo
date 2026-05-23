import { describe, it, expect } from "vitest";
import { createUser, updateUser } from "../User.js";

const validUserParams = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  passwordHash: "hashed",
};

describe("createUser", () => {
  it("stores id wrapper with the provided value", () => {
    const user = createUser(validUserParams);
    expect(user.id.value).toBe("user-1");
  });

  it("stores the name", () => {
    const user = createUser(validUserParams);
    expect(user.name).toBe("Test User");
  });

  it("stores the passwordHash", () => {
    const user = createUser(validUserParams);
    expect(user.passwordHash).toBe("hashed");
  });

  it("trims surrounding whitespace from name", () => {
    const user = createUser({ ...validUserParams, name: "  Bob  " });
    expect(user.name).toBe("Bob");
  });

  it("defaults role to 'user' when omitted", () => {
    const user = createUser(validUserParams);
    expect(user.role).toBe("user");
  });

  it("assigns 'admin' role when specified", () => {
    const user = createUser({ ...validUserParams, role: "admin" });
    expect(user.role).toBe("admin");
  });

  it("accepts 'user' as an explicit valid role", () => {
    const user = createUser({ ...validUserParams, role: "user" });
    expect(user.role).toBe("user");
  });

  it("rejects an unknown role", () => {
    expect(() =>
      createUser({ ...validUserParams, role: "superadmin" as "admin" })
    ).toThrow("Invalid role");
  });

  it("rejects empty-string role", () => {
    expect(() =>
      createUser({ ...validUserParams, role: "" as "admin" })
    ).toThrow("Invalid role");
  });

  it("defaults disabled to false", () => {
    const user = createUser(validUserParams);
    expect(user.disabled).toBe(false);
  });

  it("lowercases a mixed-case email", () => {
    const user = createUser({ ...validUserParams, email: "Test@Example.COM" });
    expect(user.email).toBe("test@example.com");
  });

  it("preserves an already-lowercase email", () => {
    const user = createUser({ ...validUserParams, email: "lower@example.com" });
    expect(user.email).toBe("lower@example.com");
  });

  it("rejects an email without an @ sign", () => {
    expect(() =>
      createUser({ ...validUserParams, email: "invalid" })
    ).toThrow("Invalid email");
  });

  it("accepts an email containing exactly one @ sign", () => {
    const user = createUser({ ...validUserParams, email: "a@b.co" });
    expect(user.email).toBe("a@b.co");
  });

  it("rejects a name that is empty", () => {
    expect(() =>
      createUser({ ...validUserParams, name: "" })
    ).toThrow("Name cannot be empty");
  });

  it("rejects a name that is only whitespace", () => {
    expect(() =>
      createUser({ ...validUserParams, name: "   " })
    ).toThrow("Name cannot be empty");
  });

  it("sets createdAt to a Date instance", () => {
    const user = createUser(validUserParams);
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it("sets updatedAt equal to createdAt at creation", () => {
    const user = createUser(validUserParams);
    expect(user.updatedAt.getTime()).toBe(user.createdAt.getTime());
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

  it("preserves the email when only name changes", () => {
    const updated = updateUser(base, { name: "New" });
    expect(updated.email).toBe("test@example.com");
  });

  it("preserves the id when only name changes", () => {
    const updated = updateUser(base, { name: "New" });
    expect(updated.id.value).toBe("user-1");
  });

  it("sets updatedAt to at-or-after the call moment", () => {
    const before = Date.now();
    const updated = updateUser(base, { name: "New" });
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
