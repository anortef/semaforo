import { describe, it, expect, beforeEach } from "vitest";
import { ExportApp } from "../ExportApp.js";
import { createApp, createEnvironment, createFeatureToggle, createToggleValue, createSecret, createSecretValue } from "@semaforo/domain";
import {
  InMemoryAppRepository,
  InMemoryEnvironmentRepository,
  InMemoryFeatureToggleRepository,
  InMemoryToggleValueRepository,
  InMemorySecretRepository,
  InMemorySecretValueRepository,
} from "./InMemoryRepos.js";

describe("ExportApp", () => {
  let appRepo: InMemoryAppRepository;
  let envRepo: InMemoryEnvironmentRepository;
  let toggleRepo: InMemoryFeatureToggleRepository;
  let valueRepo: InMemoryToggleValueRepository;
  let secretRepo: InMemorySecretRepository;
  let secretValueRepo: InMemorySecretValueRepository;
  let useCase: ExportApp;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    envRepo = new InMemoryEnvironmentRepository();
    toggleRepo = new InMemoryFeatureToggleRepository();
    valueRepo = new InMemoryToggleValueRepository();
    secretRepo = new InMemorySecretRepository();
    secretValueRepo = new InMemorySecretValueRepository();
    useCase = new ExportApp(appRepo, envRepo, toggleRepo, valueRepo, secretRepo, secretValueRepo);

    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
    envRepo.save(createEnvironment({ id: "env-1", appId: "app-1", name: "Prod", key: "prod" }));
    toggleRepo.save(createFeatureToggle({ id: "t-1", appId: "app-1", name: "Checkout", key: "checkout" }));
    valueRepo.save(createToggleValue({ id: "v-1", toggleId: "t-1", environmentId: "env-1", enabled: true }));
  });

  it("exports app name and key", async () => {
    const result = await useCase.execute("app-1");

    expect(result.app.key).toBe("shop");
  });

  it("exports environments", async () => {
    const result = await useCase.execute("app-1");

    expect(result.environments).toHaveLength(1);
  });

  it("exports toggles with values per environment", async () => {
    const result = await useCase.execute("app-1");

    expect(result.toggles[0].values.prod).toBe(true);
  });

  it("exports secrets with encrypted values per environment", async () => {
    secretRepo.save(createSecret({ id: "s-1", appId: "app-1", key: "dbPassword", description: "DB pass" }));
    secretValueRepo.save(createSecretValue({ id: "sv-1", secretId: "s-1", environmentId: "env-1", encryptedValue: "encrypted123" }));

    const result = await useCase.execute("app-1");

    expect(result.secrets).toHaveLength(1);
    expect(result.secrets[0].key).toBe("dbPassword");
    expect(result.secrets[0].values.prod).toBe("encrypted123");
  });

  it("exports empty secrets array when none exist", async () => {
    const result = await useCase.execute("app-1");

    expect(result.secrets).toEqual([]);
  });

  it("throws for non-existent app", async () => {
    await expect(useCase.execute("nope")).rejects.toThrow("App not found");
  });
});
