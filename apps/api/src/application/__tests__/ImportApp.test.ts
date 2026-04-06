import { describe, it, expect, beforeEach } from "vitest";
import { ImportApp, type AppExport } from "../ImportApp.js";
import {
  InMemoryAppRepository,
  InMemoryEnvironmentRepository,
  InMemoryFeatureToggleRepository,
  InMemoryToggleValueRepository,
} from "./InMemoryRepos.js";

const sampleExport: AppExport = {
  app: { name: "Shop", key: "shop", description: "My shop" },
  environments: [
    { name: "Prod", key: "prod", cacheTtlSeconds: 300 },
    { name: "Dev", key: "dev", cacheTtlSeconds: 0 },
  ],
  toggles: [
    { name: "Checkout", key: "checkout", description: "New checkout", values: { prod: true, dev: false } },
    { name: "Search", key: "search", description: "", values: { prod: false, dev: true } },
  ],
};

describe("ImportApp", () => {
  let appRepo: InMemoryAppRepository;
  let envRepo: InMemoryEnvironmentRepository;
  let toggleRepo: InMemoryFeatureToggleRepository;
  let valueRepo: InMemoryToggleValueRepository;
  let useCase: ImportApp;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    envRepo = new InMemoryEnvironmentRepository();
    toggleRepo = new InMemoryFeatureToggleRepository();
    valueRepo = new InMemoryToggleValueRepository();
    useCase = new ImportApp(appRepo, envRepo, toggleRepo, valueRepo);
  });

  it("creates the app", async () => {
    await useCase.execute(sampleExport);

    expect(appRepo.apps).toHaveLength(1);
  });

  it("creates environments", async () => {
    await useCase.execute(sampleExport);

    expect(envRepo.envs).toHaveLength(2);
  });

  it("creates toggles", async () => {
    await useCase.execute(sampleExport);

    expect(toggleRepo.toggles).toHaveLength(2);
  });

  it("creates toggle values", async () => {
    await useCase.execute(sampleExport);

    expect(valueRepo.values).toHaveLength(4);
  });

  it("rejects duplicate app key", async () => {
    await useCase.execute(sampleExport);

    await expect(useCase.execute(sampleExport)).rejects.toThrow("already exists");
  });
});
