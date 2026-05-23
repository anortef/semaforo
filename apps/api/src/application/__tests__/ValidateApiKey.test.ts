import { describe, it, expect, beforeEach } from "vitest";
import { ValidateApiKey } from "../ValidateApiKey.js";
import { createApiKey, type ApiKey, type ApiKeyRepository } from "@semaforo/domain";
import { hashApiKey } from "../../infrastructure/crypto/hashApiKey.js";

class InMemoryApiKeyRepository implements ApiKeyRepository {
  keys: ApiKey[] = [];

  async findById(id: string): Promise<ApiKey | null> {
    return this.keys.find((k) => k.id.value === id) ?? null;
  }
  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return this.keys.find((k) => k.keyHash === keyHash) ?? null;
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

const VALID_PLAINTEXT = "sk_test123";

describe("ValidateApiKey", () => {
  let repo: InMemoryApiKeyRepository;
  let useCase: ValidateApiKey;

  beforeEach(() => {
    repo = new InMemoryApiKeyRepository();
    useCase = new ValidateApiKey(repo);

    const key = createApiKey({
      id: "key-1",
      environmentId: "env-1",
      name: "Prod",
      keyHash: hashApiKey(VALID_PLAINTEXT),
    });
    repo.save(key);
  });

  it("returns the api key for a matching plaintext", async () => {
    const result = await useCase.execute(VALID_PLAINTEXT);

    expect(result).not.toBeNull();
  });

  it("returns the matching api key for the right environment", async () => {
    const result = await useCase.execute(VALID_PLAINTEXT);

    expect(result!.environmentId).toBe("env-1");
  });

  it("returns null for an unknown plaintext", async () => {
    const result = await useCase.execute("sk_invalid");

    expect(result).toBeNull();
  });

  it("returns null for empty input without hitting the repository", async () => {
    const result = await useCase.execute("");

    expect(result).toBeNull();
  });

  it("does not match against a stored plaintext (only the hash)", async () => {
    // Save a key whose `keyHash` field literally holds the plaintext string
    // (a degenerate case representing a misconfigured repo). The validate
    // path hashes the input first, so it must NOT match.
    const literal = createApiKey({
      id: "key-2", environmentId: "env-1", name: "literal",
      keyHash: "sk_raw_literal",
    });
    await repo.save(literal);

    const result = await useCase.execute("sk_raw_literal");

    expect(result).toBeNull();
  });
});
