import { describe, it, expect, beforeEach } from "vitest";
import { GetApp } from "../GetApp.js";
import { createApp } from "@semaforo/domain";
import { InMemoryAppRepository } from "./InMemoryRepos.js";

describe("GetApp", () => {
  let appRepo: InMemoryAppRepository;
  let useCase: GetApp;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    useCase = new GetApp(appRepo);
    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
  });

  it("returns an existing app", async () => {
    const app = await useCase.execute("app-1");

    expect(app.name).toBe("Shop");
  });

  it("throws for non-existent app", async () => {
    await expect(useCase.execute("nope")).rejects.toThrow("App not found");
  });
});
