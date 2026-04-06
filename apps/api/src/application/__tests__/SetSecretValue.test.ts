import { describe, it, expect, beforeEach } from "vitest";
import { SetSecretValue } from "../SetSecretValue.js";
import { createApp, createEnvironment, createSecret } from "@semaforo/domain";
import {
  InMemoryAppRepository,
  InMemoryEnvironmentRepository,
  InMemorySecretRepository,
  InMemorySecretValueRepository,
  SpySecretCache,
  FakeEncryptionService,
} from "./InMemoryRepos.js";

describe("SetSecretValue", () => {
  let appRepo: InMemoryAppRepository;
  let envRepo: InMemoryEnvironmentRepository;
  let secretRepo: InMemorySecretRepository;
  let secretValueRepo: InMemorySecretValueRepository;
  let cache: SpySecretCache;
  let encryption: FakeEncryptionService;
  let useCase: SetSecretValue;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    envRepo = new InMemoryEnvironmentRepository();
    secretRepo = new InMemorySecretRepository();
    secretValueRepo = new InMemorySecretValueRepository();
    cache = new SpySecretCache();
    encryption = new FakeEncryptionService();
    useCase = new SetSecretValue(secretRepo, envRepo, secretValueRepo, appRepo, encryption, cache);

    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
    envRepo.save(createEnvironment({ id: "env-1", appId: "app-1", name: "Production", key: "production" }));
    secretRepo.save(createSecret({ id: "secret-1", appId: "app-1", key: "dbPassword" }));
  });

  it("creates a new secret value", async () => {
    const result = await useCase.execute({
      secretId: "secret-1",
      environmentId: "env-1",
      plainValue: "my-password",
    });

    expect(result.secretId).toBe("secret-1");
    expect(result.environmentId).toBe("env-1");
    expect(result.encryptedValue).toBe(encryption.encrypt("my-password"));
  });

  it("updates an existing secret value", async () => {
    await useCase.execute({ secretId: "secret-1", environmentId: "env-1", plainValue: "old" });
    const result = await useCase.execute({ secretId: "secret-1", environmentId: "env-1", plainValue: "new" });

    expect(result.encryptedValue).toBe(encryption.encrypt("new"));
    expect(secretValueRepo.values.length).toBe(1);
  });

  it("invalidates cache on change", async () => {
    await useCase.execute({ secretId: "secret-1", environmentId: "env-1", plainValue: "val" });

    expect(cache.invalidated).toContain("shop:production");
  });

  it("rejects non-existent secret", async () => {
    await expect(
      useCase.execute({ secretId: "nope", environmentId: "env-1", plainValue: "val" })
    ).rejects.toThrow("Secret not found");
  });

  it("rejects non-existent environment", async () => {
    await expect(
      useCase.execute({ secretId: "secret-1", environmentId: "nope", plainValue: "val" })
    ).rejects.toThrow("Environment not found");
  });

  it("rejects cross-app secret and environment", async () => {
    appRepo.save(createApp({ id: "app-2", name: "Other", key: "other" }));
    envRepo.save(createEnvironment({ id: "env-2", appId: "app-2", name: "Dev", key: "dev" }));

    await expect(
      useCase.execute({ secretId: "secret-1", environmentId: "env-2", plainValue: "val" })
    ).rejects.toThrow("different apps");
  });
});
