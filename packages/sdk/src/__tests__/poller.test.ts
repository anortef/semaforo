import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPoller } from "../poller.js";
import type { Fetcher } from "../fetcher.js";
import { SemaforoError } from "../errors.js";

function mockFetcher(responses: Record<string, unknown>): Fetcher {
  return {
    get: vi.fn(async (path: string) => responses[path] ?? {}),
  };
}

describe("createPoller", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts and stops polling", () => {
    const fetcher = mockFetcher({ "/toggles": { a: true } });
    const poller = createPoller({
      fetcher,
      cache: null,
      intervalMs: 1000,
      resources: ["toggles"],
    });

    expect(poller.isRunning).toBe(false);
    poller.start();
    expect(poller.isRunning).toBe(true);
    poller.stop();
    expect(poller.isRunning).toBe(false);
  });

  it("fetches resources on start and at intervals", async () => {
    const fetcher = mockFetcher({ "/toggles": { a: true } });
    const poller = createPoller({
      fetcher,
      cache: null,
      intervalMs: 5000,
      resources: ["toggles"],
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher.get).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetcher.get).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetcher.get).toHaveBeenCalledTimes(3);

    poller.stop();
  });

  it("fires onUpdate when data changes", async () => {
    let callCount = 0;
    const fetcher: Fetcher = {
      get: vi.fn(async () => {
        callCount++;
        return callCount === 1 ? { a: true } : { a: false };
      }),
    };

    const onUpdate = vi.fn();
    const poller = createPoller({
      fetcher,
      cache: null,
      intervalMs: 1000,
      resources: ["toggles"],
      onUpdate,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onUpdate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(onUpdate).toHaveBeenCalledWith({
      resource: "toggles",
      data: { a: false },
      previous: { a: true },
    });

    poller.stop();
  });

  it("does not fire onUpdate when data is the same", async () => {
    const fetcher = mockFetcher({ "/toggles": { a: true } });
    const onUpdate = vi.fn();
    const poller = createPoller({
      fetcher,
      cache: null,
      intervalMs: 1000,
      resources: ["toggles"],
      onUpdate,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(onUpdate).not.toHaveBeenCalled();

    poller.stop();
  });

  it("fires onError when fetch fails", async () => {
    const err = new SemaforoError("fail", 500);
    const fetcher: Fetcher = {
      get: vi.fn().mockRejectedValue(err),
    };

    const onError = vi.fn();
    const poller = createPoller({
      fetcher,
      cache: null,
      intervalMs: 1000,
      resources: ["toggles"],
      onError,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onError).toHaveBeenCalledWith(err);

    poller.stop();
  });

  it("polls multiple resources", async () => {
    const fetcher = mockFetcher({
      "/toggles": { a: true },
      "/values": { b: "hello" },
    });
    const poller = createPoller({
      fetcher,
      cache: null,
      intervalMs: 1000,
      resources: ["toggles", "values"],
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher.get).toHaveBeenCalledWith("/toggles");
    expect(fetcher.get).toHaveBeenCalledWith("/values");

    poller.stop();
  });
});
