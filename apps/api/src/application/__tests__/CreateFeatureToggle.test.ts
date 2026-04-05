import { describe, it, expect, beforeEach } from "vitest";
import { CreateFeatureToggle } from "../CreateFeatureToggle.js";
import { createApp } from "@semaforo/domain";
import { InMemoryAppRepository, InMemoryFeatureToggleRepository } from "./InMemoryRepos.js";

describe("CreateFeatureToggle", () => {
  let appRepo: InMemoryAppRepository;
  let toggleRepo: InMemoryFeatureToggleRepository;
  let useCase: CreateFeatureToggle;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    toggleRepo = new InMemoryFeatureToggleRepository();
    useCase = new CreateFeatureToggle(appRepo, toggleRepo);
    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
  });

  it("creates a toggle for an existing app", async () => {
    const toggle = await useCase.execute({ appId: "app-1", name: "New Checkout", key: "newCheckout" });

    expect(toggle.key).toBe("newCheckout");
  });

  it("rejects non-existent app", async () => {
    await expect(
      useCase.execute({ appId: "nope", name: "Test", key: "test" })
    ).rejects.toThrow("App not found");
  });

  it("rejects duplicate key within same app", async () => {
    await useCase.execute({ appId: "app-1", name: "A", key: "newCheckout" });

    await expect(
      useCase.execute({ appId: "app-1", name: "B", key: "newCheckout" })
    ).rejects.toThrow("already exists");
  });

  it("stores optional description", async () => {
    const toggle = await useCase.execute({
      appId: "app-1", name: "A", key: "featureA", description: "my desc",
    });

    expect(toggle.description).toBe("my desc");
  });
});
