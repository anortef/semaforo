import { describe, it, expect } from "vitest";
import { createAppMember } from "../AppMember.js";

describe("AppMember", () => {
  it("creates a valid app member", () => {
    const member = createAppMember({
      id: "m-1",
      appId: "app-1",
      userId: "user-1",
      role: "editor",
    });

    expect(member.role).toBe("editor");
  });

  it("defaults role to viewer", () => {
    const member = createAppMember({
      id: "m-1",
      appId: "app-1",
      userId: "user-1",
    });

    expect(member.role).toBe("viewer");
  });

  it("accepts owner role", () => {
    const member = createAppMember({
      id: "m-1",
      appId: "app-1",
      userId: "user-1",
      role: "owner",
    });

    expect(member.role).toBe("owner");
  });

  it("rejects invalid role", () => {
    expect(() =>
      createAppMember({
        id: "m-1",
        appId: "app-1",
        userId: "user-1",
        role: "superuser" as "owner",
      })
    ).toThrow("Invalid app member role");
  });
});
