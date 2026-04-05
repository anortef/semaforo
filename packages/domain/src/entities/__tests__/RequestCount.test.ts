import { describe, it, expect } from "vitest";
import { createRequestCount } from "../RequestCount.js";

describe("RequestCount", () => {
  it("creates a valid request count", () => {
    const rc = createRequestCount({
      id: "rc-1",
      environmentId: "env-1",
      count: 42,
      windowStart: new Date("2026-04-05T10:00:00Z"),
      windowEnd: new Date("2026-04-05T10:05:00Z"),
    });

    expect(rc.count).toBe(42);
  });

  it("stores window boundaries", () => {
    const start = new Date("2026-04-05T10:00:00Z");
    const end = new Date("2026-04-05T10:05:00Z");
    const rc = createRequestCount({
      id: "rc-1",
      environmentId: "env-1",
      count: 10,
      windowStart: start,
      windowEnd: end,
    });

    expect(rc.windowEnd.getTime() - rc.windowStart.getTime()).toBe(300_000);
  });

  it("rejects negative count", () => {
    expect(() =>
      createRequestCount({
        id: "1",
        environmentId: "env-1",
        count: -1,
        windowStart: new Date(),
        windowEnd: new Date(),
      })
    ).toThrow("count cannot be negative");
  });
});
