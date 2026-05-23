import { describe, it, expect } from "vitest";
import { createRequestCount } from "../RequestCount.js";

const validRcParams = {
  id: "rc-1",
  environmentId: "env-1",
  count: 42,
  windowStart: new Date("2026-04-05T10:00:00Z"),
  windowEnd: new Date("2026-04-05T10:05:00Z"),
};

describe("createRequestCount", () => {
  it("stores id wrapper with the provided value", () => {
    const rc = createRequestCount(validRcParams);
    expect(rc.id.value).toBe("rc-1");
  });

  it("stores the environmentId", () => {
    const rc = createRequestCount(validRcParams);
    expect(rc.environmentId).toBe("env-1");
  });

  it("stores the count", () => {
    const rc = createRequestCount(validRcParams);
    expect(rc.count).toBe(42);
  });

  it("accepts a count of exactly 0", () => {
    const rc = createRequestCount({ ...validRcParams, count: 0 });
    expect(rc.count).toBe(0);
  });

  it("rejects a count of -1", () => {
    expect(() =>
      createRequestCount({ ...validRcParams, count: -1 })
    ).toThrow("count cannot be negative");
  });

  it("stores the windowStart", () => {
    const rc = createRequestCount(validRcParams);
    expect(rc.windowStart.toISOString()).toBe("2026-04-05T10:00:00.000Z");
  });

  it("stores the windowEnd", () => {
    const rc = createRequestCount(validRcParams);
    expect(rc.windowEnd.toISOString()).toBe("2026-04-05T10:05:00.000Z");
  });
});
