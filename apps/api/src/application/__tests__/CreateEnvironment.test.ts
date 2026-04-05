import { describe, it, expect, beforeEach } from "vitest";
import { CreateEnvironment } from "../CreateEnvironment.js";
import { createApp } from "@semaforo/domain";
import { InMemoryAppRepository, InMemoryEnvironmentRepository, InMemoryApiKeyRepository } from "./InMemoryRepos.js";

describe("CreateEnvironment", () => {
  let appRepo: InMemoryAppRepository;
  let envRepo: InMemoryEnvironmentRepository;
  let apiKeyRepo: InMemoryApiKeyRepository;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    envRepo = new InMemoryEnvironmentRepository();
    apiKeyRepo = new InMemoryApiKeyRepository();
    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
  });

  it("creates an environment for an existing app", async () => {
    const useCase = new CreateEnvironment(appRepo, envRepo);
    const env = await useCase.execute({ appId: "app-1", name: "Prod", key: "prod" });

    expect(env.name).toBe("Prod");
  });

  it("rejects non-existent app", async () => {
    const useCase = new CreateEnvironment(appRepo, envRepo);

    await expect(
      useCase.execute({ appId: "nope", name: "Dev", key: "dev" })
    ).rejects.toThrow("App not found");
  });

  it("rejects duplicate key within same app", async () => {
    const useCase = new CreateEnvironment(appRepo, envRepo);
    await useCase.execute({ appId: "app-1", name: "Prod", key: "prod" });

    await expect(
      useCase.execute({ appId: "app-1", name: "Prod 2", key: "prod" })
    ).rejects.toThrow("already exists");
  });

  it("auto-creates API key when apiKeyRepository provided", async () => {
    const useCase = new CreateEnvironment(appRepo, envRepo, apiKeyRepo);
    const env = await useCase.execute({ appId: "app-1", name: "Prod", key: "prod" });

    expect(apiKeyRepo.keys).toHaveLength(1);
  });

  it("auto-created API key belongs to the new environment", async () => {
    const useCase = new CreateEnvironment(appRepo, envRepo, apiKeyRepo);
    const env = await useCase.execute({ appId: "app-1", name: "Prod", key: "prod" });

    expect(apiKeyRepo.keys[0].environmentId).toBe(env.id.value);
  });

  it("does not create API key when apiKeyRepository not provided", async () => {
    const useCase = new CreateEnvironment(appRepo, envRepo);
    await useCase.execute({ appId: "app-1", name: "Prod", key: "prod" });

    expect(apiKeyRepo.keys).toHaveLength(0);
  });
});
