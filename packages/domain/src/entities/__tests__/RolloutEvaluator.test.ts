import { describe, it, expect } from "vitest";
import { evaluateRollout } from "../RolloutEvaluator.js";

describe("evaluateRollout", () => {
  it("returns true when percentage is 100", () => {
    expect(evaluateRollout(100, "toggle-1")).toBe(true);
  });

  it("returns false when percentage is 0", () => {
    expect(evaluateRollout(0, "toggle-1")).toBe(false);
  });

  it("is deterministic with the same userId", () => {
    const a = evaluateRollout(50, "toggle-1", "user-123");
    const b = evaluateRollout(50, "toggle-1", "user-123");

    expect(a).toBe(b);
  });

  it("gives different results for different users at 50%", () => {
    const results = new Set<boolean>();
    for (let i = 0; i < 100; i++) {
      results.add(evaluateRollout(50, "toggle-1", `user-${i}`));
    }

    expect(results.size).toBe(2);
  });

  it("returns a boolean without userId (random mode)", () => {
    const result = evaluateRollout(50, "toggle-1");

    expect(typeof result).toBe("boolean");
  });

  it("roughly matches percentage over many random calls", () => {
    let trueCount = 0;
    const total = 1000;
    for (let i = 0; i < total; i++) {
      if (evaluateRollout(30, `toggle-${i}`)) trueCount++;
    }

    expect(trueCount).toBeGreaterThan(150);
    expect(trueCount).toBeLessThan(450);
  });
});
