import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createAuditLogEntry } from "../AuditLogEntry.js";
import { nonEmptyName } from "../../test/arbitraries.js";

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

describe("AuditLogEntry properties", () => {
  it("preserves the id verbatim: entry.id.value === params.id for any id", () => {
    fc.assert(
      fc.property(fc.string(), (id) => {
        const entry = createAuditLogEntry({ ...validEntryParams, id });
        return entry.id.value === id;
      }),
    );
  });

  it("stores the action verbatim (no trim) for any non-empty action", () => {
    fc.assert(
      fc.property(nonEmptyName(), (action) => {
        const entry = createAuditLogEntry({ ...validEntryParams, action });
        return entry.action === action;
      }),
    );
  });

  it("preserves details verbatim for any string", () => {
    fc.assert(
      fc.property(fc.string(), (details) => {
        const entry = createAuditLogEntry({ ...validEntryParams, details });
        return entry.details === details;
      }),
    );
  });

  it("rejects whitespace-only actions of any length", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (len) => {
        let threw = false;
        try {
          createAuditLogEntry({ ...validEntryParams, action: " ".repeat(len) });
        } catch {
          threw = true;
        }
        return threw;
      }),
    );
  });
});
