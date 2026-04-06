import { describe, it, expect, beforeEach } from "vitest";
import { CreateSecret } from "../CreateSecret.js";
import { createApp } from "@semaforo/domain";
import { InMemoryAppRepository, InMemorySecretRepository } from "./InMemoryRepos.js";

describe("CreateSecret", () => {
  let appRepo: InMemoryAppRepository;
  let secretRepo: InMemorySecretRepository;
  let useCase: CreateSecret;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    secretRepo = new InMemorySecretRepository();
    useCase = new CreateSecret(appRepo, secretRepo);
    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
  });

  it("creates a secret for an existing app", async () => {
    const secret = await useCase.execute({ appId: "app-1", key: "databasePassword" });

    expect(secret.key).toBe("databasePassword");
    expect(secret.appId).toBe("app-1");
  });

  it("rejects non-existent app", async () => {
    await expect(
      useCase.execute({ appId: "nope", key: "test" })
    ).rejects.toThrow("App not found");
  });

  it("rejects duplicate key within same app", async () => {
    await useCase.execute({ appId: "app-1", key: "databasePassword" });

    await expect(
      useCase.execute({ appId: "app-1", key: "databasePassword" })
    ).rejects.toThrow("already exists");
  });

  it("stores optional description", async () => {
    const secret = await useCase.execute({
      appId: "app-1",
      key: "apiToken",
      description: "External API token",
    });

    expect(secret.description).toBe("External API token");
  });
});
