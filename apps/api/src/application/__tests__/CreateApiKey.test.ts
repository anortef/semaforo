import { describe, it, expect, beforeEach } from "vitest";
import { CreateApiKey } from "../CreateApiKey.js";
import type { ApiKey, ApiKeyRepository, App, AppRepository } from "@semaforo/domain";
import { createApp } from "@semaforo/domain";

class InMemoryApiKeyRepository implements ApiKeyRepository {
  private keys: ApiKey[] = [];

  async findById(id: string): Promise<ApiKey | null> {
    return this.keys.find((k) => k.id.value === id) ?? null;
  }
  async findByKey(key: string): Promise<ApiKey | null> {
    return this.keys.find((k) => k.key === key) ?? null;
  }
  async findByAppId(appId: string): Promise<ApiKey[]> {
    return this.keys.filter((k) => k.appId === appId);
  }
  async save(apiKey: ApiKey): Promise<void> {
    this.keys.push(apiKey);
  }
  async delete(id: string): Promise<void> {
    this.keys = this.keys.filter((k) => k.id.value !== id);
  }
}

class InMemoryAppRepository implements AppRepository {
  private apps: App[] = [];

  async findById(id: string): Promise<App | null> {
    return this.apps.find((a) => a.id.value === id) ?? null;
  }
  async findByKey(key: string): Promise<App | null> {
    return this.apps.find((a) => a.key === key) ?? null;
  }
  async findAll(): Promise<App[]> {
    return [...this.apps];
  }
  async save(app: App): Promise<void> {
    this.apps.push(app);
  }
  async delete(id: string): Promise<void> {
    this.apps = this.apps.filter((a) => a.id.value !== id);
  }
}

describe("CreateApiKey", () => {
  let apiKeyRepo: InMemoryApiKeyRepository;
  let appRepo: InMemoryAppRepository;
  let useCase: CreateApiKey;

  beforeEach(() => {
    apiKeyRepo = new InMemoryApiKeyRepository();
    appRepo = new InMemoryAppRepository();
    useCase = new CreateApiKey(apiKeyRepo, appRepo);

    const app = createApp({ id: "app-1", name: "Shop", key: "shop" });
    appRepo.save(app);
  });

  it("creates an API key for an existing app", async () => {
    const result = await useCase.execute({
      appId: "app-1",
      name: "Production Key",
    });

    expect(result.name).toBe("Production Key");
    expect(result.appId).toBe("app-1");
    expect(result.key).toMatch(/^sk_/);
    expect(result.key.length).toBeGreaterThan(20);
  });

  it("rejects non-existent app", async () => {
    await expect(
      useCase.execute({ appId: "non-existent", name: "Key" })
    ).rejects.toThrow("App not found");
  });

  it("generates unique keys", async () => {
    const k1 = await useCase.execute({ appId: "app-1", name: "Key 1" });
    const k2 = await useCase.execute({ appId: "app-1", name: "Key 2" });

    expect(k1.key).not.toBe(k2.key);
  });
});
