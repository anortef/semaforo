import { describe, it, expect, beforeEach } from "vitest";
import { CreateApiKey } from "../CreateApiKey.js";
import type { ApiKey, ApiKeyRepository, Environment, EnvironmentRepository } from "@semaforo/domain";
import { createEnvironment } from "@semaforo/domain";

class InMemoryApiKeyRepository implements ApiKeyRepository {
  private keys: ApiKey[] = [];

  async findById(id: string): Promise<ApiKey | null> {
    return this.keys.find((k) => k.id.value === id) ?? null;
  }
  async findByKey(key: string): Promise<ApiKey | null> {
    return this.keys.find((k) => k.key === key) ?? null;
  }
  async findByEnvironmentId(environmentId: string): Promise<ApiKey[]> {
    return this.keys.filter((k) => k.environmentId === environmentId);
  }
  async save(apiKey: ApiKey): Promise<void> {
    this.keys.push(apiKey);
  }
  async delete(id: string): Promise<void> {
    this.keys = this.keys.filter((k) => k.id.value !== id);
  }
}

class InMemoryEnvironmentRepository implements EnvironmentRepository {
  private envs: Environment[] = [];

  async findById(id: string): Promise<Environment | null> {
    return this.envs.find((e) => e.id.value === id) ?? null;
  }
  async findByAppId(appId: string): Promise<Environment[]> {
    return this.envs.filter((e) => e.appId === appId);
  }
  async findByAppIdAndKey(appId: string, key: string): Promise<Environment | null> {
    return this.envs.find((e) => e.appId === appId && e.key === key) ?? null;
  }
  async save(env: Environment): Promise<void> {
    this.envs.push(env);
  }
  async delete(id: string): Promise<void> {
    this.envs = this.envs.filter((e) => e.id.value !== id);
  }
}

describe("CreateApiKey", () => {
  let apiKeyRepo: InMemoryApiKeyRepository;
  let envRepo: InMemoryEnvironmentRepository;
  let useCase: CreateApiKey;

  beforeEach(() => {
    apiKeyRepo = new InMemoryApiKeyRepository();
    envRepo = new InMemoryEnvironmentRepository();
    useCase = new CreateApiKey(apiKeyRepo, envRepo);

    const env = createEnvironment({ id: "env-1", appId: "app-1", name: "Prod", key: "prod" });
    envRepo.save(env);
  });

  it("creates an API key for an existing environment", async () => {
    const result = await useCase.execute({ environmentId: "env-1" });

    expect(result.environmentId).toBe("env-1");
    expect(result.key).toMatch(/^sk_/);
    expect(result.key.length).toBeGreaterThan(20);
  });

  it("rejects non-existent environment", async () => {
    await expect(
      useCase.execute({ environmentId: "non-existent" })
    ).rejects.toThrow("Environment not found");
  });

  it("generates unique keys", async () => {
    const k1 = await useCase.execute({ environmentId: "env-1" });
    const k2 = await useCase.execute({ environmentId: "env-1" });

    expect(k1.key).not.toBe(k2.key);
  });
});
