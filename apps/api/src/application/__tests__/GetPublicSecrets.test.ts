import { describe, it, expect, beforeEach } from "vitest";
import { GetPublicSecrets } from "../GetPublicSecrets.js";
import { createApp, createEnvironment, createSecret, createSecretValue } from "@semaforo/domain";
import {
  InMemoryAppRepository,
  InMemoryEnvironmentRepository,
  InMemorySecretRepository,
  InMemorySecretValueRepository,
  SpySecretCache,
  FakeEncryptionService,
} from "./InMemoryRepos.js";

describe("GetPublicSecrets", () => {
  let appRepo: InMemoryAppRepository;
  let envRepo: InMemoryEnvironmentRepository;
  let secretRepo: InMemorySecretRepository;
  let secretValueRepo: InMemorySecretValueRepository;
  let cache: SpySecretCache;
  let encryption: FakeEncryptionService;
  let useCase: GetPublicSecrets;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    envRepo = new InMemoryEnvironmentRepository();
    secretRepo = new InMemorySecretRepository();
    secretValueRepo = new InMemorySecretValueRepository();
    cache = new SpySecretCache();
    encryption = new FakeEncryptionService();
    useCase = new GetPublicSecrets(appRepo, envRepo, secretRepo, secretValueRepo, encryption, cache);

    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
    envRepo.save(createEnvironment({ id: "env-1", appId: "app-1", name: "Production", key: "production" }));
  });

  it("returns decrypted secrets for an environment", async () => {
    secretRepo.save(createSecret({ id: "s1", appId: "app-1", key: "dbPassword" }));
    secretRepo.save(createSecret({ id: "s2", appId: "app-1", key: "apiToken" }));
    secretValueRepo.save(createSecretValue({
      id: "sv1", secretId: "s1", environmentId: "env-1",
      encryptedValue: encryption.encrypt("pass123"),
    }));
    secretValueRepo.save(createSecretValue({
      id: "sv2", secretId: "s2", environmentId: "env-1",
      encryptedValue: encryption.encrypt("tok456"),
    }));

    const result = await useCase.execute({ appKey: "shop", envKey: "production" });

    expect(result).toEqual({ dbPassword: "pass123", apiToken: "tok456" });
  });

  it("returns empty string for secrets without values", async () => {
    secretRepo.save(createSecret({ id: "s1", appId: "app-1", key: "unset" }));

    const result = await useCase.execute({ appKey: "shop", envKey: "production" });

    expect(result).toEqual({ unset: "" });
  });

  it("returns cached data when available", async () => {
    cache.data.set("shop:production", { cached: "value" });

    const result = await useCase.execute({ appKey: "shop", envKey: "production" });

    expect(result).toEqual({ cached: "value" });
  });

  it("throws for non-existent app", async () => {
    await expect(
      useCase.execute({ appKey: "nope", envKey: "production" })
    ).rejects.toThrow("App not found");
  });

  it("throws for non-existent environment", async () => {
    await expect(
      useCase.execute({ appKey: "shop", envKey: "nope" })
    ).rejects.toThrow("Environment not found");
  });
});
