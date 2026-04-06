import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import type pg from "pg";
import type { Config } from "../config/env.js";
import type { ToggleCache } from "../cache/RedisToggleCache.js";
import { swaggerSpec } from "./swagger.js";
import { PgAppRepository } from "../persistence/PgAppRepository.js";
import { PgEnvironmentRepository } from "../persistence/PgEnvironmentRepository.js";
import { PgFeatureToggleRepository } from "../persistence/PgFeatureToggleRepository.js";
import { PgToggleValueRepository } from "../persistence/PgToggleValueRepository.js";
import { PgUserRepository } from "../persistence/PgUserRepository.js";
import { PgApiKeyRepository } from "../persistence/PgApiKeyRepository.js";
import { PgRequestCountRepository } from "../persistence/PgRequestCountRepository.js";
import { CreateApp } from "../../application/CreateApp.js";
import { ListApps } from "../../application/ListApps.js";
import { GetApp } from "../../application/GetApp.js";
import { GetAppMetrics } from "../../application/GetAppMetrics.js";
import { CreateEnvironment } from "../../application/CreateEnvironment.js";
import { ListEnvironments } from "../../application/ListEnvironments.js";
import { UpdateEnvironment } from "../../application/UpdateEnvironment.js";
import { CreateFeatureToggle } from "../../application/CreateFeatureToggle.js";
import { ListToggles } from "../../application/ListToggles.js";
import { SetToggleValue } from "../../application/SetToggleValue.js";
import { GetPublicToggles } from "../../application/GetPublicToggles.js";
import { Login } from "../../application/Login.js";
import { CreateApiKey } from "../../application/CreateApiKey.js";
import { ListApiKeys } from "../../application/ListApiKeys.js";
import { DeleteApiKey } from "../../application/DeleteApiKey.js";
import { ExportApp } from "../../application/ExportApp.js";
import { ExportAll } from "../../application/ExportAll.js";
import { ImportApp } from "../../application/ImportApp.js";
import { ImportAll } from "../../application/ImportAll.js";
import { GetAppAuditLog } from "../../application/GetAppAuditLog.js";
import { AdminCreateUser } from "../../application/admin/CreateUser.js";
import { AdminListUsers } from "../../application/admin/ListUsers.js";
import { AdminUpdateUser } from "../../application/admin/UpdateUser.js";
import { AdminDeleteUser } from "../../application/admin/DeleteUser.js";
import { AdminResetUserPassword } from "../../application/admin/ResetUserPassword.js";
import { AdminListSystemSettings } from "../../application/admin/ListSystemSettings.js";
import { AdminUpdateSystemSetting } from "../../application/admin/UpdateSystemSetting.js";
import { AdminListAuditLog } from "../../application/admin/ListAuditLog.js";
import { RecordAuditEvent } from "../../application/admin/RecordAuditEvent.js";
import { PgAppMemberRepository } from "../persistence/PgAppMemberRepository.js";
import { PgSystemSettingRepository } from "../persistence/PgSystemSettingRepository.js";
import { PgAuditLogRepository } from "../persistence/PgAuditLogRepository.js";
import { AddAppMember } from "../../application/AddAppMember.js";
import { RemoveAppMember } from "../../application/RemoveAppMember.js";
import { ListAppMembers } from "../../application/ListAppMembers.js";
import { publicRoutes } from "./routes/publicRoutes.js";
import { appRoutes } from "./routes/appRoutes.js";
import { environmentRoutes } from "./routes/environmentRoutes.js";
import { toggleRoutes } from "./routes/toggleRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { apiKeyRoutes } from "./routes/apiKeyRoutes.js";
import { appMemberRoutes } from "./routes/appMemberRoutes.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { createAuthMiddleware } from "./middleware/authMiddleware.js";
import { createAdminMiddleware } from "./middleware/adminMiddleware.js";
import { createApiKeyMiddleware } from "./middleware/apiKeyMiddleware.js";
import { createLoginLimiter, createPublicLimiter } from "./middleware/rateLimiter.js";
import { createSecurityLogger } from "../logging/securityLogger.js";
import type { RequestCounter } from "../cache/RedisToggleCache.js";

export function createExpressApp(
  pool: pg.Pool,
  config: Config,
  cache: ToggleCache,
  requestCounter?: RequestCounter
) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.cors.origin }));
  app.use(express.json({ limit: "1mb" }));

  // Repositories
  const appRepository = new PgAppRepository(pool);
  const environmentRepository = new PgEnvironmentRepository(pool);
  const toggleRepository = new PgFeatureToggleRepository(pool);
  const toggleValueRepository = new PgToggleValueRepository(pool);
  const userRepository = new PgUserRepository(pool);
  const apiKeyRepository = new PgApiKeyRepository(pool);
  const appMemberRepository = new PgAppMemberRepository(pool);
  const systemSettingRepository = new PgSystemSettingRepository(pool);
  const auditLogRepository = new PgAuditLogRepository(pool);

  // Use cases
  const createAppUseCase = new CreateApp(appRepository);
  const listApps = new ListApps(appRepository);
  const getApp = new GetApp(appRepository);
  const requestCountRepository = new PgRequestCountRepository(pool);
  const getAppMetrics = new GetAppMetrics(appRepository, environmentRepository, toggleRepository, cache, requestCounter, requestCountRepository);
  const exportApp = new ExportApp(appRepository, environmentRepository, toggleRepository, toggleValueRepository);
  const importApp = new ImportApp(appRepository, environmentRepository, toggleRepository, toggleValueRepository);
  const getAppAuditLog = new GetAppAuditLog(appRepository, environmentRepository, toggleRepository, auditLogRepository);
  const exportAll = new ExportAll(appRepository, exportApp, userRepository, systemSettingRepository, appMemberRepository, apiKeyRepository, environmentRepository);
  const importAll = new ImportAll(importApp, userRepository, systemSettingRepository, appMemberRepository, apiKeyRepository, appRepository, environmentRepository);
  const createEnvironment = new CreateEnvironment(
    appRepository,
    environmentRepository,
    apiKeyRepository
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
  const login = new Login(userRepository, config.jwt.secret);
  const createApiKeyUseCase = new CreateApiKey(apiKeyRepository, environmentRepository);
  const listApiKeysUseCase = new ListApiKeys(apiKeyRepository);
  const deleteApiKeyUseCase = new DeleteApiKey(apiKeyRepository);
  const addAppMember = new AddAppMember(appMemberRepository);
  const removeAppMember = new RemoveAppMember(appMemberRepository);
  const listAppMembersUseCase = new ListAppMembers(appMemberRepository);

  // Admin use cases
  const adminCreateUser = new AdminCreateUser(userRepository);
  const adminListUsers = new AdminListUsers(userRepository);
  const adminUpdateUser = new AdminUpdateUser(userRepository);
  const adminDeleteUser = new AdminDeleteUser(userRepository);
  const adminResetPassword = new AdminResetUserPassword(userRepository);
  const adminListSettings = new AdminListSystemSettings(systemSettingRepository);
  const adminUpdateSetting = new AdminUpdateSystemSetting(systemSettingRepository);
  const adminListAuditLog = new AdminListAuditLog(auditLogRepository);
  const recordAudit = new RecordAuditEvent(auditLogRepository);

  // Security logger
  const securityLogger = createSecurityLogger();

  // Middleware
  const auth = createAuthMiddleware(config.jwt.secret, securityLogger);
  const adminAuth = createAdminMiddleware(securityLogger);
  const apiKeyAuth = createApiKeyMiddleware(apiKeyRepository);

  // Swagger
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api/docs.json", (_req, res) => { res.json(swaggerSpec); });

  // Public routes (API key required, rate limited)
  app.use("/api/public", createPublicLimiter(), apiKeyAuth, publicRoutes(getPublicToggles, environmentRepository, appRepository, cache, requestCounter));

  // Auth routes (login rate limited)
  app.use("/api/auth", createLoginLimiter(), authRoutes(login, config.jwt.secret, securityLogger));

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

  // Admin routes (require JWT auth + admin role)
  app.use("/api/admin", auth, adminAuth, adminRoutes({
    createUser: adminCreateUser,
    listUsers: adminListUsers,
    updateUser: adminUpdateUser,
    deleteUser: adminDeleteUser,
    resetPassword: adminResetPassword,
    listSettings: adminListSettings,
    updateSetting: adminUpdateSetting,
    listAuditLog: adminListAuditLog,
    recordAudit,
    pool,
    userRepository,
    appRepository,
    environmentRepository,
    toggleRepository,
    exportAll,
    importAll,
  }));

  // Protected routes (require JWT auth)
  app.use("/api/apps", auth, appRoutes(createAppUseCase, listApps, getApp, getAppMetrics, exportApp, importApp, recordAudit, getAppAuditLog, userRepository));
  app.use("/api/apps", auth, appMemberRoutes(addAppMember, removeAppMember, listAppMembersUseCase, userRepository, recordAudit));
  app.use("/api/environments", auth, apiKeyRoutes(createApiKeyUseCase, listApiKeysUseCase, deleteApiKeyUseCase, securityLogger));
  app.use("/api/api-keys", auth, apiKeyRoutes(createApiKeyUseCase, listApiKeysUseCase, deleteApiKeyUseCase, securityLogger));
  app.use(
    "/api",
    auth,
    environmentRoutes(createEnvironment, listEnvironments, updateEnvironmentUseCase, appRepository, environmentRepository, cache, recordAudit)
  );
  app.use("/api", auth, toggleRoutes(createToggle, setToggleValue, listToggles, getPublicToggles, recordAudit, toggleValueRepository, environmentRepository));

  return app;
}
