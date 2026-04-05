import { describe, it, expect, beforeEach } from "vitest";
import { GetAppMetrics } from "../GetAppMetrics.js";
import { createApp, createEnvironment, createFeatureToggle, createRequestCount } from "@semaforo/domain";
import { InMemoryAppRepository, InMemoryEnvironmentRepository, InMemoryFeatureToggleRepository } from "./InMemoryRepos.js";
import type { ToggleCache, RequestCounter } from "../../infrastructure/cache/RedisToggleCache.js";
import type { RequestCount, RequestCountRepository } from "@semaforo/domain";

class StubToggleCache implements ToggleCache {
  private store = new Map<string, { data: string; ttl: number }>();

  async get() { return null; }
  async set(appKey: string, envKey: string, toggles: Record<string, boolean>, ttl: number) {
    this.store.set(`toggles:${appKey}:${envKey}`, { data: JSON.stringify(toggles), ttl });
  }
  async invalidate() {}
  async getByApiKey() { return null; }
  async setByApiKey() {}
  async getCacheInfo(appKey: string, envKey: string) {
    const entry = this.store.get(`toggles:${appKey}:${envKey}`);
    if (!entry) return null;
    return { sizeBytes: entry.data.length, remainingTtl: entry.ttl };
  }
}

class StubRequestCounter implements RequestCounter {
  private counts = new Map<string, number>();
  setCount(envId: string, count: number) { this.counts.set(envId, count); }
  async increment() {}
  async getAndReset() { return 0; }
  async getAllEnvironmentIds() { return []; }
  async getCurrentCount(envId: string) { return this.counts.get(envId) ?? 0; }
}

class InMemoryRequestCountRepository implements RequestCountRepository {
  entries: RequestCount[] = [];
  async save(entry: RequestCount) { this.entries.push(entry); }
  async sumByEnvironmentIdSince(envId: string, since: Date) {
    return this.entries
      .filter((e) => e.environmentId === envId && e.windowEnd >= since)
      .reduce((sum, e) => sum + e.count, 0);
  }
  async sumByEnvironmentIds(envIds: string[], since: Date) {
    const map = new Map<string, number>();
    for (const id of envIds) {
      map.set(id, await this.sumByEnvironmentIdSince(id, since));
    }
    return map;
  }
}

describe("GetAppMetrics", () => {
  let appRepo: InMemoryAppRepository;
  let envRepo: InMemoryEnvironmentRepository;
  let toggleRepo: InMemoryFeatureToggleRepository;
  let cache: StubToggleCache;
  let counter: StubRequestCounter;
  let requestCountRepo: InMemoryRequestCountRepository;
  let useCase: GetAppMetrics;

  beforeEach(async () => {
    appRepo = new InMemoryAppRepository();
    envRepo = new InMemoryEnvironmentRepository();
    toggleRepo = new InMemoryFeatureToggleRepository();
    cache = new StubToggleCache();
    counter = new StubRequestCounter();
    requestCountRepo = new InMemoryRequestCountRepository();
    useCase = new GetAppMetrics(appRepo, envRepo, toggleRepo, cache, counter, requestCountRepo);

    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
    envRepo.save(createEnvironment({ id: "env-1", appId: "app-1", name: "Prod", key: "prod" }));
    envRepo.save(createEnvironment({ id: "env-2", appId: "app-1", name: "Dev", key: "dev" }));
    toggleRepo.save(createFeatureToggle({ id: "t-1", appId: "app-1", name: "A", key: "featureA" }));
    toggleRepo.save(createFeatureToggle({ id: "t-2", appId: "app-1", name: "B", key: "featureB" }));
  });

  it("returns the toggle count", async () => {
    const metrics = await useCase.execute("app-1");

    expect(metrics.toggleCount).toBe(2);
  });

  it("returns environment count", async () => {
    const metrics = await useCase.execute("app-1");

    expect(metrics.environments).toHaveLength(2);
  });

  it("returns cache info when cache is populated", async () => {
    await cache.set("shop", "prod", { featureA: true, featureB: false }, 300);
    const metrics = await useCase.execute("app-1");
    const prod = metrics.environments.find((e) => e.key === "prod");

    expect(prod!.cache!.sizeBytes).toBeGreaterThan(0);
  });

  it("returns null cache info when no cache entry exists", async () => {
    const metrics = await useCase.execute("app-1");
    const dev = metrics.environments.find((e) => e.key === "dev");

    expect(dev!.cache).toBeNull();
  });

  it("throws for non-existent app", async () => {
    await expect(useCase.execute("nope")).rejects.toThrow("App not found");
  });

  it("includes current unflushed requests from Redis", async () => {
    counter.setCount("env-1", 15);
    const metrics = await useCase.execute("app-1");
    const prod = metrics.environments.find((e) => e.key === "prod");

    expect(prod!.requests.current).toBe(15);
  });

  it("includes historical request counts from database", async () => {
    const now = new Date();
    requestCountRepo.save(createRequestCount({
      id: "rc-1",
      environmentId: "env-1",
      count: 100,
      windowStart: new Date(now.getTime() - 10 * 60_000),
      windowEnd: new Date(now.getTime() - 5 * 60_000),
    }));

    const metrics = await useCase.execute("app-1");
    const prod = metrics.environments.find((e) => e.key === "prod");

    expect(prod!.requests.last1h).toBeGreaterThanOrEqual(100);
  });

  it("returns zero requests when no data exists", async () => {
    const metrics = await useCase.execute("app-1");
    const dev = metrics.environments.find((e) => e.key === "dev");

    expect(dev!.requests.last5m).toBe(0);
  });
});
