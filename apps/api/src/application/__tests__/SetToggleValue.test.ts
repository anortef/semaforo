import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import { SetToggleValue } from "../SetToggleValue.js";
import { createApp, createEnvironment, createFeatureToggle } from "@semaforo/domain";
import {
  InMemoryAppRepository,
  InMemoryEnvironmentRepository,
  InMemoryFeatureToggleRepository,
  InMemoryToggleValueRepository,
  SpyToggleCache,
} from "./InMemoryRepos.js";

describe("SetToggleValue", () => {
  let appRepo: InMemoryAppRepository;
  let envRepo: InMemoryEnvironmentRepository;
  let toggleRepo: InMemoryFeatureToggleRepository;
  let valueRepo: InMemoryToggleValueRepository;
  let cache: SpyToggleCache;
  let useCase: SetToggleValue;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    envRepo = new InMemoryEnvironmentRepository();
    toggleRepo = new InMemoryFeatureToggleRepository();
    valueRepo = new InMemoryToggleValueRepository();
    cache = new SpyToggleCache();
    useCase = new SetToggleValue(toggleRepo, envRepo, valueRepo, appRepo, cache);

    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
    envRepo.save(createEnvironment({ id: "env-1", appId: "app-1", name: "Prod", key: "prod" }));
    toggleRepo.save(createFeatureToggle({ id: "t-1", appId: "app-1", name: "Checkout", key: "checkout" }));
  });

  it("creates a new toggle value", async () => {
    const value = await useCase.execute({ toggleId: "t-1", environmentId: "env-1", enabled: true });

    expect(value.enabled).toBe(true);
  });

  it("updates an existing toggle value", async () => {
    await useCase.execute({ toggleId: "t-1", environmentId: "env-1", enabled: true });
    const value = await useCase.execute({ toggleId: "t-1", environmentId: "env-1", enabled: false });

    expect(value.enabled).toBe(false);
  });

  it("throws for non-existent toggle", async () => {
    await expect(
      useCase.execute({ toggleId: "nope", environmentId: "env-1", enabled: true })
    ).rejects.toThrow("Toggle not found");
  });

  it("throws for non-existent environment", async () => {
    await expect(
      useCase.execute({ toggleId: "t-1", environmentId: "nope", enabled: true })
    ).rejects.toThrow("Environment not found");
  });

  it("throws when toggle and env belong to different apps", async () => {
    appRepo.save(createApp({ id: "app-2", name: "Blog", key: "blog" }));
    envRepo.save(createEnvironment({ id: "env-2", appId: "app-2", name: "Dev", key: "dev" }));

    await expect(
      useCase.execute({ toggleId: "t-1", environmentId: "env-2", enabled: true })
    ).rejects.toThrow("different apps");
  });

  it("invalidates cache after setting value", async () => {
    await useCase.execute({ toggleId: "t-1", environmentId: "env-1", enabled: true });

    expect(cache.invalidated).toContain("shop:prod");
  });
});

describe("SetToggleValue properties", () => {
  const freshSetup = () => {
    const appRepo = new InMemoryAppRepository();
    const envRepo = new InMemoryEnvironmentRepository();
    const toggleRepo = new InMemoryFeatureToggleRepository();
    const valueRepo = new InMemoryToggleValueRepository();
    const cache = new SpyToggleCache();
    const useCase = new SetToggleValue(toggleRepo, envRepo, valueRepo, appRepo, cache);
    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
    envRepo.save(createEnvironment({ id: "env-1", appId: "app-1", name: "Prod", key: "prod" }));
    toggleRepo.save(createFeatureToggle({ id: "t-1", appId: "app-1", name: "Checkout", key: "checkout" }));
    return { appRepo, envRepo, toggleRepo, valueRepo, cache, useCase };
  };

  it("idempotence: N writes for the same (toggleId, envId) produce exactly one value record", () => {
    return fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 10 }), fc.boolean(), async (n, enabled) => {
        const { valueRepo, useCase } = freshSetup();
        for (let i = 0; i < n; i++) {
          await useCase.execute({ toggleId: "t-1", environmentId: "env-1", enabled });
        }
        return valueRepo.values.length === 1;
      }),
      { numRuns: 20 },
    );
  });

  it("every successful write triggers a cache invalidation for the app+env", () => {
    return fc.assert(
      fc.asyncProperty(fc.boolean(), fc.integer({ min: 0, max: 100 }), async (enabled, percentage) => {
        const { cache, useCase } = freshSetup();
        await useCase.execute({
          toggleId: "t-1",
          environmentId: "env-1",
          enabled,
          rolloutPercentage: percentage,
        });
        return cache.invalidated.includes("shop:prod");
      }),
    );
  });

  it("rolloutPercentage is clamped into [0, 100] for any input integer", () => {
    return fc.assert(
      fc.asyncProperty(fc.integer({ min: -10000, max: 10000 }), async (n) => {
        const { useCase } = freshSetup();
        const result = await useCase.execute({
          toggleId: "t-1",
          environmentId: "env-1",
          rolloutPercentage: n,
        });
        return result.rolloutPercentage >= 0 && result.rolloutPercentage <= 100;
      }),
    );
  });

  it("the final stored `enabled` matches the most recent write", () => {
    return fc.assert(
      fc.asyncProperty(fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), async (sequence) => {
        const { valueRepo, useCase } = freshSetup();
        for (const enabled of sequence) {
          await useCase.execute({ toggleId: "t-1", environmentId: "env-1", enabled });
        }
        return valueRepo.values[0]!.enabled === sequence[sequence.length - 1];
      }),
    );
  });
});
