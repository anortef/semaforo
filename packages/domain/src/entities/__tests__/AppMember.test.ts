import { describe, it, expect } from "vitest";
import { createAppMember } from "../AppMember.js";

const validMemberParams = {
  id: "m-1",
  appId: "app-1",
  userId: "user-1",
};

describe("createAppMember", () => {
  it("stores id wrapper with the provided value", () => {
    const member = createAppMember(validMemberParams);
    expect(member.id.value).toBe("m-1");
  });

  it("stores the appId", () => {
    const member = createAppMember(validMemberParams);
    expect(member.appId).toBe("app-1");
  });

  it("stores the userId", () => {
    const member = createAppMember(validMemberParams);
    expect(member.userId).toBe("user-1");
  });

  it("defaults role to 'viewer' when omitted", () => {
    const member = createAppMember(validMemberParams);
    expect(member.role).toBe("viewer");
  });

  it("accepts 'owner' as an explicit role", () => {
    const member = createAppMember({ ...validMemberParams, role: "owner" });
    expect(member.role).toBe("owner");
  });

  it("accepts 'editor' as an explicit role", () => {
    const member = createAppMember({ ...validMemberParams, role: "editor" });
    expect(member.role).toBe("editor");
  });

  it("accepts 'viewer' as an explicit role", () => {
    const member = createAppMember({ ...validMemberParams, role: "viewer" });
    expect(member.role).toBe("viewer");
  });

  it("rejects an unknown role", () => {
    expect(() =>
      createAppMember({ ...validMemberParams, role: "superuser" as "owner" })
    ).toThrow("Invalid app member role");
  });

  it("rejects an empty-string role", () => {
    expect(() =>
      createAppMember({ ...validMemberParams, role: "" as "owner" })
    ).toThrow("Invalid app member role");
  });

  it("sets createdAt to a Date instance", () => {
    const member = createAppMember(validMemberParams);
    expect(member.createdAt).toBeInstanceOf(Date);
  });
});
