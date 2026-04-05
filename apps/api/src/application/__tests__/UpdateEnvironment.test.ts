import { describe, it, expect, beforeEach } from "vitest";
import { UpdateEnvironment } from "../UpdateEnvironment.js";
import { createApp, createEnvironment } from "@semaforo/domain";
import { InMemoryAppRepository, InMemoryEnvironmentRepository, SpyToggleCache } from "./InMemoryRepos.js";

describe("UpdateEnvironment", () => {
  let appRepo: InMemoryAppRepository;
  let envRepo: InMemoryEnvironmentRepository;
  let cache: SpyToggleCache;
  let useCase: UpdateEnvironment;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    envRepo = new InMemoryEnvironmentRepository();
    cache = new SpyToggleCache();
    useCase = new UpdateEnvironment(envRepo, appRepo, cache);

    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
    envRepo.save(createEnvironment({ id: "env-1", appId: "app-1", name: "Prod", key: "prod" }));
  });

  it("updates the name", async () => {
    const updated = await useCase.execute({ environmentId: "env-1", name: "Production" });

    expect(updated.name).toBe("Production");
  });

  it("updates cacheTtlSeconds", async () => {
    const updated = await useCase.execute({ environmentId: "env-1", cacheTtlSeconds: 60 });

    expect(updated.cacheTtlSeconds).toBe(60);
  });

  it("throws for non-existent environment", async () => {
    await expect(
      useCase.execute({ environmentId: "nope", name: "X" })
    ).rejects.toThrow("Environment not found");
  });

  it("invalidates cache when TTL changes", async () => {
    await useCase.execute({ environmentId: "env-1", cacheTtlSeconds: 0 });

    expect(cache.invalidated).toContain("shop:prod");
  });

  it("does not invalidate cache when only name changes", async () => {
    await useCase.execute({ environmentId: "env-1", name: "New Name" });

    expect(cache.invalidated).toHaveLength(0);
  });
});
