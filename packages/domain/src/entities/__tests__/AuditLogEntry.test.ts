import { describe, it, expect } from "vitest";
import { createAuditLogEntry } from "../AuditLogEntry.js";

const validEntryParams = {
  id: "a-1",
  userId: "user-1",
  action: "user.created",
  resourceType: "user",
  resourceId: "user-2",
  details: '{"email":"new@test.com"}',
};

describe("createAuditLogEntry", () => {
  it("stores id wrapper with the provided value", () => {
    const entry = createAuditLogEntry(validEntryParams);
    expect(entry.id.value).toBe("a-1");
  });

  it("stores the userId", () => {
    const entry = createAuditLogEntry(validEntryParams);
    expect(entry.userId).toBe("user-1");
  });

  it("stores the action verbatim (no trim)", () => {
    const entry = createAuditLogEntry({ ...validEntryParams, action: "  user.created  " });
    expect(entry.action).toBe("  user.created  ");
  });

  it("stores the resourceType", () => {
    const entry = createAuditLogEntry(validEntryParams);
    expect(entry.resourceType).toBe("user");
  });

  it("stores the resourceId", () => {
    const entry = createAuditLogEntry(validEntryParams);
    expect(entry.resourceId).toBe("user-2");
  });

  it("stores the details", () => {
    const entry = createAuditLogEntry(validEntryParams);
    expect(entry.details).toBe('{"email":"new@test.com"}');
  });

  it("defaults details to '{}' when omitted", () => {
    const { details: _ignored, ...withoutDetails } = validEntryParams;
    const entry = createAuditLogEntry(withoutDetails);
    expect(entry.details).toBe("{}");
  });

  it("rejects an empty action", () => {
    expect(() =>
      createAuditLogEntry({ ...validEntryParams, action: "" })
    ).toThrow("Audit action cannot be empty");
  });

  it("rejects a whitespace-only action", () => {
    expect(() =>
      createAuditLogEntry({ ...validEntryParams, action: "   " })
    ).toThrow("Audit action cannot be empty");
  });

  it("sets createdAt to a Date instance", () => {
    const entry = createAuditLogEntry(validEntryParams);
    expect(entry.createdAt).toBeInstanceOf(Date);
  });
});
