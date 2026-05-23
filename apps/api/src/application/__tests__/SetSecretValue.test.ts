import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
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

describe("SetSecretValue properties", () => {
  const freshSetup = () => {
    const appRepo = new InMemoryAppRepository();
    const envRepo = new InMemoryEnvironmentRepository();
    const secretRepo = new InMemorySecretRepository();
    const valueRepo = new InMemorySecretValueRepository();
    const cache = new SpySecretCache();
    const encryption = new FakeEncryptionService();
    const useCase = new SetSecretValue(secretRepo, envRepo, valueRepo, appRepo, encryption, cache);
    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
    envRepo.save(createEnvironment({ id: "env-1", appId: "app-1", name: "Production", key: "production" }));
    secretRepo.save(createSecret({ id: "secret-1", appId: "app-1", key: "dbPassword" }));
    return { valueRepo, cache, encryption, useCase };
  };

  it("encryption round-trip: stored encrypted value decrypts back to the plaintext", () => {
    return fc.assert(
      fc.asyncProperty(fc.string({ minLength: 0, maxLength: 200 }), async (plain) => {
        const { useCase, encryption } = freshSetup();
        const result = await useCase.execute({
          secretId: "secret-1",
          environmentId: "env-1",
          plainValue: plain,
        });
        return encryption.decrypt(result.encryptedValue) === plain;
      }),
    );
  });

  it("idempotence: N writes for the same (secretId, envId) produce one record", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.string({ minLength: 0, maxLength: 50 }),
        async (n, plain) => {
          const { valueRepo, useCase } = freshSetup();
          for (let i = 0; i < n; i++) {
            await useCase.execute({ secretId: "secret-1", environmentId: "env-1", plainValue: plain });
          }
          return valueRepo.values.length === 1;
        },
      ),
      { numRuns: 20 },
    );
  });

  it("every successful write triggers a cache invalidation for the app+env", () => {
    return fc.assert(
      fc.asyncProperty(fc.string({ minLength: 0, maxLength: 100 }), async (plain) => {
        const { cache, useCase } = freshSetup();
        await useCase.execute({ secretId: "secret-1", environmentId: "env-1", plainValue: plain });
        return cache.invalidated.includes("shop:production");
      }),
    );
  });

  it("the final stored encryptedValue matches the most recent write", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 1, maxLength: 8 }),
        async (sequence) => {
          const { valueRepo, useCase, encryption } = freshSetup();
          for (const plain of sequence) {
            await useCase.execute({ secretId: "secret-1", environmentId: "env-1", plainValue: plain });
          }
          const last = sequence[sequence.length - 1]!;
          return encryption.decrypt(valueRepo.values[0]!.encryptedValue) === last;
        },
      ),
    );
  });
});
