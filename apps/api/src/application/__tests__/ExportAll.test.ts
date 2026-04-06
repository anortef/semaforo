import { describe, it, expect, beforeEach } from "vitest";
import { ExportAll } from "../ExportAll.js";
import { ExportApp } from "../ExportApp.js";
import { createApp } from "@semaforo/domain";
import {
  InMemoryAppRepository,
  InMemoryEnvironmentRepository,
  InMemoryFeatureToggleRepository,
  InMemoryToggleValueRepository,
} from "./InMemoryRepos.js";

describe("ExportAll", () => {
  let appRepo: InMemoryAppRepository;
  let useCase: ExportAll;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    const envRepo = new InMemoryEnvironmentRepository();
    const toggleRepo = new InMemoryFeatureToggleRepository();
    const valueRepo = new InMemoryToggleValueRepository();
    const exportApp = new ExportApp(appRepo, envRepo, toggleRepo, valueRepo);
    useCase = new ExportAll(appRepo, exportApp);

    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
    appRepo.save(createApp({ id: "app-2", name: "Blog", key: "blog" }));
  });

  it("exports all apps", async () => {
    const result = await useCase.execute();

    expect(result.apps).toHaveLength(2);
  });

  it("includes export timestamp", async () => {
    const result = await useCase.execute();

    expect(result.exportedAt).toBeDefined();
  });
});
