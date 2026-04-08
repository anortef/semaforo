import { describe, it, expect, vi } from "vitest";
import { createFetcher } from "../fetcher.js";
import {
  UnauthorizedError,
  NotFoundError,
  RateLimitError,
  ServerError,
  SemaforoError,
} from "../errors.js";

function mockFetch(status: number, body: unknown, headers?: Record<string, string>): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "Test",
    headers: { get: (key: string) => headers?.[key.toLowerCase()] ?? null },
    json: () => Promise.resolve(body),
  });
}

describe("createFetcher", () => {
  it("makes GET requests with api key header", async () => {
    const fetch = mockFetch(200, { darkMode: true });
    const fetcher = createFetcher({ baseUrl: "https://example.com", apiKey: "sk_test", fetch });

    const result = await fetcher.get("/toggles");

    expect(result).toEqual({ darkMode: true });
    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/api/public/toggles",
      expect.objectContaining({
        method: "GET",
        headers: { "x-api-key": "sk_test" },
      }),
    );
  });

  it("strips trailing slashes from base URL", async () => {
    const fetch = mockFetch(200, {});
    const fetcher = createFetcher({ baseUrl: "https://example.com///", apiKey: "sk_test", fetch });
    await fetcher.get("/toggles");
    expect(fetch).toHaveBeenCalledWith("https://example.com/api/public/toggles", expect.anything());
  });

  it("throws UnauthorizedError on 401", async () => {
    const fetch = mockFetch(401, { error: "API key required" });
    const fetcher = createFetcher({ baseUrl: "https://example.com", apiKey: "bad", fetch });
    await expect(fetcher.get("/toggles")).rejects.toThrow(UnauthorizedError);
  });

  it("throws NotFoundError on 404", async () => {
    const fetch = mockFetch(404, { error: "App not found" });
    const fetcher = createFetcher({ baseUrl: "https://example.com", apiKey: "sk_test", fetch });
    await expect(fetcher.get("/toggles")).rejects.toThrow(NotFoundError);
  });

  it("throws RateLimitError on 429 with retry-after", async () => {
    const fetch = mockFetch(429, { error: "Too many requests" }, { "retry-after": "5" });
    const fetcher = createFetcher({ baseUrl: "https://example.com", apiKey: "sk_test", fetch });

    try {
      await fetcher.get("/toggles");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(5000);
    }
  });

  it("throws ServerError on 500", async () => {
    const fetch = mockFetch(500, { error: "Internal server error" });
    const fetcher = createFetcher({ baseUrl: "https://example.com", apiKey: "sk_test", fetch });
    await expect(fetcher.get("/toggles")).rejects.toThrow(ServerError);
  });

  it("throws SemaforoError on network failure", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const fetcher = createFetcher({ baseUrl: "https://example.com", apiKey: "sk_test", fetch });

    try {
      await fetcher.get("/toggles");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SemaforoError);
      expect((err as SemaforoError).statusCode).toBe(0);
      expect((err as SemaforoError).message).toBe("fetch failed");
    }
  });

  it("passes through AbortSignal", async () => {
    const fetch = mockFetch(200, {});
    const fetcher = createFetcher({ baseUrl: "https://example.com", apiKey: "sk_test", fetch });
    const controller = new AbortController();
    await fetcher.get("/toggles", controller.signal);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
