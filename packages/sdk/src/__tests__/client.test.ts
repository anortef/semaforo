import { describe, it, expect, vi, afterEach } from "vitest";
import { SemaforoClient } from "../client.js";

function mockFetch(body: unknown): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  });
}

describe("SemaforoClient", () => {
  afterEach(() => vi.useRealTimers());

  it("throws if baseUrl is missing", () => {
    expect(() => new SemaforoClient({ baseUrl: "", apiKey: "sk_test", polling: false })).toThrow("baseUrl is required");
  });

  it("throws if apiKey is missing", () => {
    expect(() => new SemaforoClient({ baseUrl: "https://example.com", apiKey: "", polling: false })).toThrow("apiKey is required");
  });

  describe("getToggles", () => {
    it("fetches all toggles", async () => {
      const fetch = mockFetch({ darkMode: true, beta: false });
      const client = new SemaforoClient({ baseUrl: "https://example.com", apiKey: "sk_test", polling: false, cache: false, fetch });

      const result = await client.getToggles();
      expect(result).toEqual({ darkMode: true, beta: false });
      expect(fetch).toHaveBeenCalledWith(
        "https://example.com/api/public/toggles",
        expect.objectContaining({ headers: { "x-api-key": "sk_test" } }),
      );
    });
  });

  describe("getToggle", () => {
    it("fetches a single toggle and unwraps", async () => {
      const fetch = mockFetch({ darkMode: true });
      const client = new SemaforoClient({ baseUrl: "https://example.com", apiKey: "sk_test", polling: false, cache: false, fetch });

      const result = await client.getToggle("darkMode");
      expect(result).toBe(true);
    });

    it("returns false for missing toggle", async () => {
      const fetch = mockFetch({});
      const client = new SemaforoClient({ baseUrl: "https://example.com", apiKey: "sk_test", polling: false, cache: false, fetch });

      const result = await client.getToggle("missing");
      expect(result).toBe(false);
    });
  });

  describe("getValues", () => {
    it("fetches all string values", async () => {
      const fetch = mockFetch({ banner: "Hello!", note: "" });
      const client = new SemaforoClient({ baseUrl: "https://example.com", apiKey: "sk_test", polling: false, cache: false, fetch });

      const result = await client.getValues();
      expect(result).toEqual({ banner: "Hello!", note: "" });
    });
  });

  describe("getValue", () => {
    it("fetches a single value and unwraps", async () => {
      const fetch = mockFetch({ banner: "Hello!" });
      const client = new SemaforoClient({ baseUrl: "https://example.com", apiKey: "sk_test", polling: false, cache: false, fetch });

      const result = await client.getValue("banner");
      expect(result).toBe("Hello!");
    });

    it("returns empty string for missing value", async () => {
      const fetch = mockFetch({});
      const client = new SemaforoClient({ baseUrl: "https://example.com", apiKey: "sk_test", polling: false, cache: false, fetch });

      const result = await client.getValue("missing");
      expect(result).toBe("");
    });
  });

  describe("getSecrets", () => {
    it("fetches all secrets", async () => {
      const fetch = mockFetch({ dbPassword: "s3cret" });
      const client = new SemaforoClient({ baseUrl: "https://example.com", apiKey: "sk_test", polling: false, cache: false, fetch });

      const result = await client.getSecrets();
      expect(result).toEqual({ dbPassword: "s3cret" });
    });
  });

  describe("caching", () => {
    it("returns cached data on second call", async () => {
      const fetch = mockFetch({ a: true });
      const client = new SemaforoClient({ baseUrl: "https://example.com", apiKey: "sk_test", polling: false, cache: { ttlMs: 10000 }, fetch });

      await client.getToggles();
      await client.getToggles();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("skips cache when requested", async () => {
      const fetch = mockFetch({ a: true });
      const client = new SemaforoClient({ baseUrl: "https://example.com", apiKey: "sk_test", polling: false, cache: { ttlMs: 10000 }, fetch });

      await client.getToggles();
      await client.getToggles({ skipCache: true });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("does not cache when cache is disabled", async () => {
      const fetch = mockFetch({ a: true });
      const client = new SemaforoClient({ baseUrl: "https://example.com", apiKey: "sk_test", polling: false, cache: false, fetch });

      await client.getToggles();
      await client.getToggles();
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("clearCache empties the cache", async () => {
      const fetch = mockFetch({ a: true });
      const client = new SemaforoClient({ baseUrl: "https://example.com", apiKey: "sk_test", polling: false, cache: { ttlMs: 10000 }, fetch });

      await client.getToggles();
      client.clearCache();
      await client.getToggles();
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("polling", () => {
    it("starts polling by default", () => {
      vi.useFakeTimers();
      const fetch = mockFetch({ a: true });
      const client = new SemaforoClient({ baseUrl: "https://example.com", apiKey: "sk_test", fetch });

      // Polling is on by default, fetch should have been called
      expect(fetch).toHaveBeenCalled();
      client.destroy();
    });

    it("destroy stops polling", () => {
      vi.useFakeTimers();
      const fetch = mockFetch({ a: true });
      const client = new SemaforoClient({ baseUrl: "https://example.com", apiKey: "sk_test", fetch });
      client.destroy();

      const callCount = (fetch as ReturnType<typeof vi.fn>).mock.calls.length;
      vi.advanceTimersByTime(60000);
      expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
    });
  });
});
