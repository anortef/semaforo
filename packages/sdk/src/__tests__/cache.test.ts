import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TtlCache } from "../cache.js";

describe("TtlCache", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns undefined for missing keys", () => {
    const cache = new TtlCache(1000);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("stores and retrieves values", () => {
    const cache = new TtlCache(1000);
    cache.set("key", { a: 1 });
    expect(cache.get("key")).toEqual({ a: 1 });
  });

  it("expires entries after TTL", () => {
    const cache = new TtlCache(1000);
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");

    vi.advanceTimersByTime(999);
    expect(cache.get("key")).toBe("value");

    vi.advanceTimersByTime(1);
    expect(cache.get("key")).toBeUndefined();
  });

  it("deletes a specific key", () => {
    const cache = new TtlCache(1000);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
  });

  it("clears all entries", () => {
    const cache = new TtlCache(1000);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
  });

  it("overwrites existing entries with fresh TTL", () => {
    const cache = new TtlCache(1000);
    cache.set("key", "old");
    vi.advanceTimersByTime(800);
    cache.set("key", "new");
    vi.advanceTimersByTime(800);
    expect(cache.get("key")).toBe("new");
  });
});
