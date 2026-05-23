import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { evaluateRollout } from "../RolloutEvaluator.js";
import { percentage } from "../../test/arbitraries.js";

describe("evaluateRollout", () => {
  it("returns true when percentage is exactly 100", () => {
    expect(evaluateRollout(100, "toggle-1")).toBe(true);
  });

  it("returns true when percentage is greater than 100", () => {
    expect(evaluateRollout(101, "toggle-1")).toBe(true);
  });

  it("returns false when percentage is exactly 0", () => {
    expect(evaluateRollout(0, "toggle-1")).toBe(false);
  });

  it("returns false when percentage is less than 0", () => {
    expect(evaluateRollout(-1, "toggle-1")).toBe(false);
  });

  it("is deterministic for the same (toggleKey, userId)", () => {
    const a = evaluateRollout(50, "toggle-1", "user-123");
    const b = evaluateRollout(50, "toggle-1", "user-123");
    expect(a).toBe(b);
  });

  it("places (toggle-1, user-123) outside a 50% rollout", () => {
    expect(evaluateRollout(50, "toggle-1", "user-123")).toBe(false);
  });

  it("places (toggle-1, user-aaa) outside a 20% rollout but (toggle-1, user-zzz) inside it", () => {
    const outside = evaluateRollout(20, "toggle-1", "user-aaa");
    const inside = evaluateRollout(20, "toggle-1", "user-zzz");
    expect(outside === false && inside === true).toBe(true);
  });

  it("yields both true and false outcomes across many users at 50%", () => {
    const results = new Set<boolean>();
    for (let i = 0; i < 100; i++) {
      results.add(evaluateRollout(50, "toggle-1", `user-${i}`));
    }
    expect(results.size).toBe(2);
  });

  it("returns a boolean without a userId (random mode)", () => {
    const result = evaluateRollout(50, "toggle-1");
    expect(typeof result).toBe("boolean");
  });

  it("places a user just under the cutoff into the included bucket", () => {
    expect(evaluateRollout(100, "toggle-x", "user-1")).toBe(true);
  });

  it("excludes everyone when percentage is 0 even with a userId", () => {
    expect(evaluateRollout(0, "toggle-x", "user-1")).toBe(false);
  });

  it("hashes 'feature-x' + 'user-1' inside a 50% rollout (bucket 5)", () => {
    expect(evaluateRollout(50, "feature-x", "user-1")).toBe(true);
  });

  it("hashes 'feature-x' + 'user-10' outside a 50% rollout (bucket 85)", () => {
    expect(evaluateRollout(50, "feature-x", "user-10")).toBe(false);
  });

  it("hashes 'feature-y' + 'user-1' outside a 20% rollout while 'feature-x' + 'user-1' stays inside", () => {
    const x = evaluateRollout(20, "feature-x", "user-1");
    const y = evaluateRollout(20, "feature-y", "user-1");
    expect(x === true && y === false).toBe(true);
  });

  it("yields a true-count near the configured 30% over 1000 samples", () => {
    let trueCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (evaluateRollout(30, `toggle-${i}`, `user-${i}`)) trueCount++;
    }
    const ok = trueCount >= 200 && trueCount <= 400;
    expect(ok).toBe(true);
  });

  it("excludes most users in random mode at 1% rollout", () => {
    let trueCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (evaluateRollout(1, "toggle-random")) trueCount++;
    }
    expect(trueCount).toBeLessThan(100);
  });

  it("includes most users in random mode at 99% rollout", () => {
    let trueCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (evaluateRollout(99, "toggle-random")) trueCount++;
    }
    expect(trueCount).toBeGreaterThan(900);
  });

  it("treats bucket equal to percentage as outside the rollout (strict <)", () => {
    // ("feature-x", "user-1") hashes to bucket 5 — at exactly 5% rollout, 5 < 5 is false.
    expect(evaluateRollout(5, "feature-x", "user-1")).toBe(false);
  });
});

describe("evaluateRollout properties", () => {
  it("is deterministic for any (percentage, toggleKey, userId) — including empty-string userId", () => {
    fc.assert(
      fc.property(percentage(), fc.string(), fc.string(), (p, k, u) => {
        return evaluateRollout(p, k, u) === evaluateRollout(p, k, u);
      }),
    );
  });

  it("always returns true at 100% rollout", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (k, u) => {
        return evaluateRollout(100, k, u) === true;
      }),
    );
  });

  it("always returns false at 0% rollout", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (k, u) => {
        return evaluateRollout(0, k, u) === false;
      }),
    );
  });

  it("always returns a boolean for any percentage with a userId", () => {
    fc.assert(
      fc.property(percentage(), fc.string(), fc.string(), (p, k, u) => {
        return typeof evaluateRollout(p, k, u) === "boolean";
      }),
    );
  });

  it("is monotonic in percentage: included at p1 implies included at any p2 >= p1", () => {
    fc.assert(
      fc.property(
        percentage(),
        percentage(),
        fc.string(),
        fc.string(),
        (p1, p2, k, u) => {
          const low = Math.min(p1, p2);
          const high = Math.max(p1, p2);
          const inAtLow = evaluateRollout(low, k, u);
          const inAtHigh = evaluateRollout(high, k, u);
          // If included at the lower percentage, must remain included at the higher one.
          return !inAtLow || inAtHigh;
        },
      ),
    );
  });

  it("yields a true-count within ±10% of the configured percentage over 1000 distinct users", () => {
    fc.assert(
      fc.property(fc.integer({ min: 20, max: 80 }), fc.string({ minLength: 1, maxLength: 20 }), (p, key) => {
        let trueCount = 0;
        for (let i = 0; i < 1000; i++) {
          if (evaluateRollout(p, key, `user-${i}`)) trueCount++;
        }
        const rate = trueCount / 10; // 0-100
        return Math.abs(rate - p) <= 10;
      }),
      { numRuns: 10 },
    );
  });
});
