import express from "express";
import cors from "cors";
import type pg from "pg";
import type { Config } from "../config/env.js";
import { PgAppRepository } from "../persistence/PgAppRepository.js";
import { PgEnvironmentRepository } from "../persistence/PgEnvironmentRepository.js";
import { PgFeatureToggleRepository } from "../persistence/PgFeatureToggleRepository.js";
import { PgToggleValueRepository } from "../persistence/PgToggleValueRepository.js";
import { CreateApp } from "../../application/CreateApp.js";
import { CreateEnvironment } from "../../application/CreateEnvironment.js";
import { CreateFeatureToggle } from "../../application/CreateFeatureToggle.js";
import { SetToggleValue } from "../../application/SetToggleValue.js";
import { GetPublicToggles } from "../../application/GetPublicToggles.js";
import { publicRoutes } from "./routes/publicRoutes.js";
import { appRoutes } from "./routes/appRoutes.js";
import { environmentRoutes } from "./routes/environmentRoutes.js";
import { toggleRoutes } from "./routes/toggleRoutes.js";

export function createExpressApp(pool: pg.Pool, config: Config) {
  const app = express();

  app.use(cors({ origin: config.cors.origin }));
  app.use(express.json());

  // Repositories
  const appRepository = new PgAppRepository(pool);
  const environmentRepository = new PgEnvironmentRepository(pool);
  const toggleRepository = new PgFeatureToggleRepository(pool);
  const toggleValueRepository = new PgToggleValueRepository(pool);

  // Use cases
  const createAppUseCase = new CreateApp(appRepository);
  const createEnvironment = new CreateEnvironment(
    appRepository,
    environmentRepository
  );
  const createToggle = new CreateFeatureToggle(appRepository, toggleRepository);
  const setToggleValue = new SetToggleValue(
    toggleRepository,
    environmentRepository,
    toggleValueRepository
  );
  const getPublicToggles = new GetPublicToggles(
    appRepository,
    environmentRepository,
    toggleRepository,
    toggleValueRepository
  );

  // Routes
  app.use("/api/public", publicRoutes(getPublicToggles));
  app.use("/api/apps", appRoutes(createAppUseCase, appRepository));
  app.use("/api", environmentRoutes(createEnvironment, environmentRepository));
  app.use("/api", toggleRoutes(createToggle, setToggleValue, toggleRepository));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
