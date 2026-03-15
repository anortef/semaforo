import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import type pg from "pg";
import type { Config } from "../config/env.js";
import type { ToggleCache } from "../cache/RedisToggleCache.js";
import { swaggerSpec } from "./swagger.js";
import { PgAppRepository } from "../persistence/PgAppRepository.js";
import { PgEnvironmentRepository } from "../persistence/PgEnvironmentRepository.js";
import { PgFeatureToggleRepository } from "../persistence/PgFeatureToggleRepository.js";
import { PgToggleValueRepository } from "../persistence/PgToggleValueRepository.js";
import { CreateApp } from "../../application/CreateApp.js";
import { ListApps } from "../../application/ListApps.js";
import { GetApp } from "../../application/GetApp.js";
import { CreateEnvironment } from "../../application/CreateEnvironment.js";
import { ListEnvironments } from "../../application/ListEnvironments.js";
import { UpdateEnvironment } from "../../application/UpdateEnvironment.js";
import { CreateFeatureToggle } from "../../application/CreateFeatureToggle.js";
import { ListToggles } from "../../application/ListToggles.js";
import { SetToggleValue } from "../../application/SetToggleValue.js";
import { GetPublicToggles } from "../../application/GetPublicToggles.js";
import { publicRoutes } from "./routes/publicRoutes.js";
import { appRoutes } from "./routes/appRoutes.js";
import { environmentRoutes } from "./routes/environmentRoutes.js";
import { toggleRoutes } from "./routes/toggleRoutes.js";

export function createExpressApp(
  pool: pg.Pool,
  config: Config,
  cache: ToggleCache
) {
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
  const listApps = new ListApps(appRepository);
  const getApp = new GetApp(appRepository);
  const createEnvironment = new CreateEnvironment(
    appRepository,
    environmentRepository
  );
  const listEnvironments = new ListEnvironments(environmentRepository);
  const updateEnvironmentUseCase = new UpdateEnvironment(environmentRepository, appRepository, cache);
  const createToggle = new CreateFeatureToggle(appRepository, toggleRepository);
  const listToggles = new ListToggles(toggleRepository);
  const setToggleValue = new SetToggleValue(
    toggleRepository,
    environmentRepository,
    toggleValueRepository,
    appRepository,
    cache
  );
  const getPublicToggles = new GetPublicToggles(
    appRepository,
    environmentRepository,
    toggleRepository,
    toggleValueRepository,
    cache
  );

  // Swagger
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api/docs.json", (_req, res) => { res.json(swaggerSpec); });

  // Routes
  app.use("/api/public", publicRoutes(getPublicToggles));
  app.use("/api/apps", appRoutes(createAppUseCase, listApps, getApp));
  app.use(
    "/api",
    environmentRoutes(createEnvironment, listEnvironments, updateEnvironmentUseCase, appRepository, environmentRepository, cache)
  );
  app.use("/api", toggleRoutes(createToggle, setToggleValue, listToggles));

  /**
   * @openapi
   * /health:
   *   get:
   *     tags: [Health]
   *     summary: Health check
   *     responses:
   *       200:
   *         description: API is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   */
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
