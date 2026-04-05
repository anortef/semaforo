import { describe, it, expect } from "vitest";
import { createAuditLogEntry } from "../AuditLogEntry.js";

describe("AuditLogEntry", () => {
  it("creates a valid audit log entry", () => {
    const entry = createAuditLogEntry({
      id: "a-1",
      userId: "user-1",
      action: "user.created",
      resourceType: "user",
      resourceId: "user-2",
      details: '{"email":"new@test.com"}',
    });

    expect(entry.action).toBe("user.created");
  });

  it("stores resource info", () => {
    const entry = createAuditLogEntry({
      id: "a-1",
      userId: "user-1",
      action: "setting.updated",
      resourceType: "setting",
      resourceId: "publicDomain",
      details: "{}",
    });

    expect(entry.resourceType).toBe("setting");
  });

  it("rejects empty action", () => {
    expect(() =>
      createAuditLogEntry({
        id: "1",
        userId: "u",
        action: "",
        resourceType: "user",
        resourceId: "u2",
        details: "{}",
      })
    ).toThrow("action cannot be empty");
  });

  it("defaults details to empty object", () => {
    const entry = createAuditLogEntry({
      id: "a-1",
      userId: "user-1",
      action: "user.deleted",
      resourceType: "user",
      resourceId: "user-2",
    });

    expect(entry.details).toBe("{}");
  });
});
