import { describe, it, expect, beforeEach } from "vitest";
import { ValidateApiKey } from "../ValidateApiKey.js";
import { createApiKey, type ApiKey, type ApiKeyRepository } from "@semaforo/domain";

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

describe("ValidateApiKey", () => {
  let repo: InMemoryApiKeyRepository;
  let useCase: ValidateApiKey;

  beforeEach(() => {
    repo = new InMemoryApiKeyRepository();
    useCase = new ValidateApiKey(repo);

    const key = createApiKey({
      id: "key-1",
      appId: "app-1",
      name: "Prod",
      key: "sk_test123",
    });
    repo.save(key);
  });

  it("returns the api key for a valid key", async () => {
    const result = await useCase.execute("sk_test123");

    expect(result).not.toBeNull();
    expect(result!.appId).toBe("app-1");
  });

  it("returns null for an invalid key", async () => {
    const result = await useCase.execute("sk_invalid");

    expect(result).toBeNull();
  });

  it("returns null for empty key", async () => {
    const result = await useCase.execute("");

    expect(result).toBeNull();
  });
});
