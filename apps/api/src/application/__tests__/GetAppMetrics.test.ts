import { describe, it, expect, beforeEach } from "vitest";
import { GetAppMetrics } from "../GetAppMetrics.js";
import { createApp, createEnvironment, createFeatureToggle } from "@semaforo/domain";
import { InMemoryAppRepository, InMemoryEnvironmentRepository, InMemoryFeatureToggleRepository } from "./InMemoryRepos.js";
import type { ToggleCache } from "../../infrastructure/cache/RedisToggleCache.js";

class StubToggleCache implements ToggleCache {
  private store = new Map<string, { data: string; ttl: number; setAt: number }>();

  async get() { return null; }
  async set(appKey: string, envKey: string, toggles: Record<string, boolean>, ttl: number) {
    this.store.set(`toggles:${appKey}:${envKey}`, {
      data: JSON.stringify(toggles),
      ttl,
      setAt: Date.now(),
    });
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

describe("GetAppMetrics", () => {
  let appRepo: InMemoryAppRepository;
  let envRepo: InMemoryEnvironmentRepository;
  let toggleRepo: InMemoryFeatureToggleRepository;
  let cache: StubToggleCache;
  let useCase: GetAppMetrics;

  beforeEach(async () => {
    appRepo = new InMemoryAppRepository();
    envRepo = new InMemoryEnvironmentRepository();
    toggleRepo = new InMemoryFeatureToggleRepository();
    cache = new StubToggleCache();
    useCase = new GetAppMetrics(appRepo, envRepo, toggleRepo, cache);

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

    expect(prod!.cache.sizeBytes).toBeGreaterThan(0);
  });

  it("returns null cache info when no cache entry exists", async () => {
    const metrics = await useCase.execute("app-1");
    const dev = metrics.environments.find((e) => e.key === "dev");

    expect(dev!.cache).toBeNull();
  });

  it("throws for non-existent app", async () => {
    await expect(useCase.execute("nope")).rejects.toThrow("App not found");
  });

  it("includes environment name and configured TTL", async () => {
    const metrics = await useCase.execute("app-1");
    const prod = metrics.environments.find((e) => e.key === "prod");

    expect(prod!.name).toBe("Prod");
  });
});
