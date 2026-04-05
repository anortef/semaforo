import { describe, it, expect, beforeEach } from "vitest";
import { GetPublicToggles } from "../GetPublicToggles.js";
import { NoOpToggleCache } from "../../infrastructure/cache/RedisToggleCache.js";
import type {
  App,
  AppRepository,
  Environment,
  EnvironmentRepository,
  FeatureToggle,
  FeatureToggleRepository,
  ToggleValue,
  ToggleValueRepository,
} from "@semaforo/domain";

class InMemoryAppRepository implements AppRepository {
  apps: App[] = [];
  async findById(id: string) {
    return this.apps.find((a) => a.id.value === id) ?? null;
  }
  async findByKey(key: string) {
    return this.apps.find((a) => a.key === key) ?? null;
  }
  async findAll() {
    return this.apps;
  }
  async save(app: App) {
    this.apps.push(app);
  }
  async delete() {}
}

class InMemoryEnvironmentRepository implements EnvironmentRepository {
  envs: Environment[] = [];
  async findById(id: string) {
    return this.envs.find((e) => e.id.value === id) ?? null;
  }
  async findByAppId(appId: string) {
    return this.envs.filter((e) => e.appId === appId);
  }
  async findByAppIdAndKey(appId: string, key: string) {
    return this.envs.find((e) => e.appId === appId && e.key === key) ?? null;
  }
  async save(env: Environment) {
    this.envs.push(env);
  }
  async delete() {}
}

class InMemoryToggleRepository implements FeatureToggleRepository {
  toggles: FeatureToggle[] = [];
  async findById(id: string) {
    return this.toggles.find((t) => t.id.value === id) ?? null;
  }
  async findByAppId(appId: string) {
    return this.toggles.filter((t) => t.appId === appId);
  }
  async findByAppIdAndKey(appId: string, key: string) {
    return (
      this.toggles.find((t) => t.appId === appId && t.key === key) ?? null
    );
  }
  async save(t: FeatureToggle) {
    this.toggles.push(t);
  }
  async delete() {}
}

class InMemoryToggleValueRepository implements ToggleValueRepository {
  values: ToggleValue[] = [];
  async findByToggleAndEnvironment(toggleId: string, envId: string) {
    return (
      this.values.find(
        (v) => v.toggleId === toggleId && v.environmentId === envId
      ) ?? null
    );
  }
  async findByEnvironmentId(envId: string) {
    return this.values.filter((v) => v.environmentId === envId);
  }
  async save(v: ToggleValue) {
    this.values.push(v);
  }
  async delete() {}
}

describe("GetPublicToggles", () => {
  let appRepo: InMemoryAppRepository;
  let envRepo: InMemoryEnvironmentRepository;
  let toggleRepo: InMemoryToggleRepository;
  let valueRepo: InMemoryToggleValueRepository;
  let useCase: GetPublicToggles;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    envRepo = new InMemoryEnvironmentRepository();
    toggleRepo = new InMemoryToggleRepository();
    valueRepo = new InMemoryToggleValueRepository();
    useCase = new GetPublicToggles(appRepo, envRepo, toggleRepo, valueRepo, new NoOpToggleCache());
  });

  it("returns toggle map for an app environment", async () => {
    appRepo.apps.push({
      id: { value: "app-1" },
      name: "App",
      key: "my-app",
      description: "",
      createdAt: new Date(),
    });
    envRepo.envs.push({
      id: { value: "env-1" },
      appId: "app-1",
      name: "Prod",
      key: "prod",
      cacheTtlSeconds: 300,
      createdAt: new Date(),
    });
    toggleRepo.toggles.push(
      {
        id: { value: "t-1" },
        appId: "app-1",
        name: "New Checkout",
        key: "newCheckout",
        description: "",
        createdAt: new Date(),
      },
      {
        id: { value: "t-2" },
        appId: "app-1",
        name: "Beta Search",
        key: "betaSearch",
        description: "",
        createdAt: new Date(),
      }
    );
    valueRepo.values.push({
      id: { value: "v-1" },
      toggleId: "t-1",
      environmentId: "env-1",
      enabled: true,
      updatedAt: new Date(),
    });

    const result = await useCase.execute({
      appKey: "my-app",
      envKey: "prod",
    });

    expect(result).toEqual({
      newCheckout: true,
      betaSearch: false,
    });
  });

  it("throws when app not found", async () => {
    await expect(
      useCase.execute({ appKey: "nope", envKey: "prod" })
    ).rejects.toThrow("App not found");
  });

  it("returns single toggle value when toggleKey provided", async () => {
    appRepo.apps.push({
      id: { value: "app-1" }, name: "App", key: "my-app", description: "", createdAt: new Date(),
    });
    envRepo.envs.push({
      id: { value: "env-1" }, appId: "app-1", name: "Prod", key: "prod", cacheTtlSeconds: 300, createdAt: new Date(),
    });
    toggleRepo.toggles.push(
      { id: { value: "t-1" }, appId: "app-1", name: "A", key: "featureA", description: "", createdAt: new Date() },
      { id: { value: "t-2" }, appId: "app-1", name: "B", key: "featureB", description: "", createdAt: new Date() },
    );
    valueRepo.values.push({
      id: { value: "v-1" }, toggleId: "t-1", environmentId: "env-1", enabled: true, updatedAt: new Date(),
    });

    const result = await useCase.execute({ appKey: "my-app", envKey: "prod", toggleKey: "featureA" });

    expect(result).toEqual({ featureA: true });
  });

  it("returns false for unknown toggle key", async () => {
    appRepo.apps.push({
      id: { value: "app-1" }, name: "App", key: "my-app", description: "", createdAt: new Date(),
    });
    envRepo.envs.push({
      id: { value: "env-1" }, appId: "app-1", name: "Prod", key: "prod", cacheTtlSeconds: 300, createdAt: new Date(),
    });

    const result = await useCase.execute({ appKey: "my-app", envKey: "prod", toggleKey: "nonExistent" });

    expect(result).toEqual({ nonExistent: false });
  });
});
