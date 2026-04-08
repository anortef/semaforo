#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import type {
  App, Environment, FeatureToggle, ToggleValue,
  Secret, SecretValue, ApiKey, AppMember, RequestCount,
  User, SystemSetting,
} from "@semaforo/domain";

// JSON persistence
import { JsonFileStore } from "./infrastructure/persistence/json/JsonFileStore.js";
import { CascadeHelper } from "./infrastructure/persistence/json/CascadeHelper.js";
import { JsonAppRepository } from "./infrastructure/persistence/json/JsonAppRepository.js";
import { JsonEnvironmentRepository } from "./infrastructure/persistence/json/JsonEnvironmentRepository.js";
import { JsonFeatureToggleRepository } from "./infrastructure/persistence/json/JsonFeatureToggleRepository.js";
import { JsonToggleValueRepository } from "./infrastructure/persistence/json/JsonToggleValueRepository.js";
import { JsonUserRepository } from "./infrastructure/persistence/json/JsonUserRepository.js";
import { JsonApiKeyRepository } from "./infrastructure/persistence/json/JsonApiKeyRepository.js";
import { JsonAppMemberRepository } from "./infrastructure/persistence/json/JsonAppMemberRepository.js";
import { JsonSystemSettingRepository } from "./infrastructure/persistence/json/JsonSystemSettingRepository.js";
import { JsonAuditLogRepository } from "./infrastructure/persistence/json/JsonAuditLogRepository.js";
import { JsonSecretRepository } from "./infrastructure/persistence/json/JsonSecretRepository.js";
import { JsonSecretValueRepository } from "./infrastructure/persistence/json/JsonSecretValueRepository.js";
import { JsonRequestCountRepository } from "./infrastructure/persistence/json/JsonRequestCountRepository.js";

// In-memory caches
import { InMemoryToggleCache } from "./infrastructure/cache/InMemoryToggleCache.js";
import { InMemoryRequestCounter } from "./infrastructure/cache/InMemoryRequestCounter.js";
import { NoOpSecretCache } from "./infrastructure/cache/SecretCache.js";

// Use cases
import { CreateApp } from "./application/CreateApp.js";
import { ListApps } from "./application/ListApps.js";
import { GetApp } from "./application/GetApp.js";
import { GetAppMetrics } from "./application/GetAppMetrics.js";
import { CreateEnvironment } from "./application/CreateEnvironment.js";
import { ListEnvironments } from "./application/ListEnvironments.js";
import { UpdateEnvironment } from "./application/UpdateEnvironment.js";
import { CreateFeatureToggle } from "./application/CreateFeatureToggle.js";
import { ListToggles } from "./application/ListToggles.js";
import { SetToggleValue } from "./application/SetToggleValue.js";
import { GetPublicToggles } from "./application/GetPublicToggles.js";
import { GetPublicValues } from "./application/GetPublicValues.js";
import { GetPublicSecrets } from "./application/GetPublicSecrets.js";
import { Login } from "./application/Login.js";
import { CreateApiKey } from "./application/CreateApiKey.js";
import { ListApiKeys } from "./application/ListApiKeys.js";
import { DeleteApiKey } from "./application/DeleteApiKey.js";
import { DeleteApp } from "./application/DeleteApp.js";
import { DeleteEnvironment } from "./application/DeleteEnvironment.js";
import { DeleteFeatureToggle } from "./application/DeleteFeatureToggle.js";
import { ExportApp } from "./application/ExportApp.js";
import { ExportAll } from "./application/ExportAll.js";
import { ImportApp } from "./application/ImportApp.js";
import { ImportAll } from "./application/ImportAll.js";
import { GetAppAuditLog } from "./application/GetAppAuditLog.js";
import { CreateSecret } from "./application/CreateSecret.js";
import { ListSecrets } from "./application/ListSecrets.js";
import { DeleteSecret } from "./application/DeleteSecret.js";
import { SetSecretValue } from "./application/SetSecretValue.js";
import { GetSecretValue } from "./application/GetSecretValue.js";
import { RevealSecretValue } from "./application/RevealSecretValue.js";
import { AddAppMember } from "./application/AddAppMember.js";
import { RemoveAppMember } from "./application/RemoveAppMember.js";
import { ListAppMembers } from "./application/ListAppMembers.js";
import { AdminCreateUser } from "./application/admin/CreateUser.js";
import { AdminListUsers } from "./application/admin/ListUsers.js";
import { AdminUpdateUser } from "./application/admin/UpdateUser.js";
import { AdminDeleteUser } from "./application/admin/DeleteUser.js";
import { AdminResetUserPassword } from "./application/admin/ResetUserPassword.js";
import { AdminListSystemSettings } from "./application/admin/ListSystemSettings.js";
import { AdminUpdateSystemSetting } from "./application/admin/UpdateSystemSetting.js";
import { AdminListAuditLog } from "./application/admin/ListAuditLog.js";
import { RecordAuditEvent } from "./application/admin/RecordAuditEvent.js";
import { SeedDefaultUser } from "./application/SeedDefaultUser.js";
import { FlushRequestCounts } from "./application/FlushRequestCounts.js";
import { ScheduledBackup } from "./application/ScheduledBackup.js";

// Routes & middleware
import { publicRoutes } from "./infrastructure/http/routes/publicRoutes.js";
import { authRoutes } from "./infrastructure/http/routes/authRoutes.js";
import { appRoutes } from "./infrastructure/http/routes/appRoutes.js";
import { environmentRoutes } from "./infrastructure/http/routes/environmentRoutes.js";
import { toggleRoutes } from "./infrastructure/http/routes/toggleRoutes.js";
import { secretRoutes } from "./infrastructure/http/routes/secretRoutes.js";
import { apiKeyRoutes } from "./infrastructure/http/routes/apiKeyRoutes.js";
import { appMemberRoutes } from "./infrastructure/http/routes/appMemberRoutes.js";
import { adminRoutes } from "./infrastructure/http/routes/adminRoutes.js";
import { createAuthMiddleware } from "./infrastructure/http/middleware/authMiddleware.js";
import { createAdminMiddleware } from "./infrastructure/http/middleware/adminMiddleware.js";
import { createApiKeyMiddleware } from "./infrastructure/http/middleware/apiKeyMiddleware.js";
import { createLoginLimiter, createPublicLimiter, createRateLimitConfigReader } from "./infrastructure/http/middleware/rateLimiter.js";
import { createSecurityLogger } from "./infrastructure/logging/securityLogger.js";
import { createEncryptionService } from "./infrastructure/crypto/EncryptionService.js";

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(names: string[], fallback?: string): string | undefined {
  for (const name of names) {
    const flag = name.length === 1 ? `-${name}` : `--${name}`;
    const idx = args.indexOf(flag);
    if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  }
  return fallback;
}

const defaultDataDir = path.join(process.env.HOME ?? "~", ".semaforo");

// --- Config ---
interface StandaloneConfig {
  jwtSecret: string;
  encryptionKey: string;
  dataDir?: string;
  port?: number;
}

function resolveConfigPath(): string {
  return getArg(["c", "config"]) ?? path.join(defaultDataDir, "config.json");
}

function loadOrCreateConfig(configPath: string): StandaloneConfig {
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, "utf-8")) as StandaloneConfig;
  }
  const config: StandaloneConfig = {
    jwtSecret: crypto.randomBytes(32).toString("hex"),
    encryptionKey: crypto.randomBytes(32).toString("hex"),
    dataDir: defaultDataDir,
    port: 3001,
  };
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  console.log(`Generated config at ${configPath}`);
  return config;
}

async function main() {
  const configPath = resolveConfigPath();
  const config = loadOrCreateConfig(configPath);

  // CLI args override config file values
  const dataDir = getArg(["data-dir"]) ?? config.dataDir ?? defaultDataDir;
  const port = parseInt(getArg(["port"]) ?? String(config.port ?? 3001), 10);
  const dataPath = path.join(dataDir, "data");

  // --- Initialize stores ---
  const stores = {
    apps: new JsonFileStore<App>(path.join(dataPath, "apps.json"), (a) => a.id.value),
    environments: new JsonFileStore<Environment>(path.join(dataPath, "environments.json"), (e) => e.id.value),
    toggles: new JsonFileStore<FeatureToggle>(path.join(dataPath, "toggles.json"), (t) => t.id.value),
    toggleValues: new JsonFileStore<ToggleValue>(path.join(dataPath, "toggle-values.json"), (v) => v.id.value),
    users: new JsonFileStore<User>(path.join(dataPath, "users.json"), (u) => u.id.value),
    apiKeys: new JsonFileStore<ApiKey>(path.join(dataPath, "api-keys.json"), (k) => k.id.value),
    members: new JsonFileStore<AppMember>(path.join(dataPath, "members.json"), (m) => m.id.value),
    settings: new JsonFileStore<SystemSetting>(path.join(dataPath, "settings.json"), (s) => s.id.value),
    secrets: new JsonFileStore<Secret>(path.join(dataPath, "secrets.json"), (s) => s.id.value),
    secretValues: new JsonFileStore<SecretValue>(path.join(dataPath, "secret-values.json"), (v) => v.id.value),
    requestCounts: new JsonFileStore<RequestCount>(path.join(dataPath, "request-counts.json"), (r) => r.id.value),
  };

  await Promise.all(Object.values(stores).map((s) => s.load()));

  // --- Cascade helper & repositories ---
  const cascade = new CascadeHelper(stores);
  const appRepository = new JsonAppRepository(stores.apps, cascade);
  const environmentRepository = new JsonEnvironmentRepository(stores.environments, cascade);
  const toggleRepository = new JsonFeatureToggleRepository(stores.toggles, cascade);
  const toggleValueRepository = new JsonToggleValueRepository(stores.toggleValues);
  const userRepository = new JsonUserRepository(stores.users);
  const apiKeyRepository = new JsonApiKeyRepository(stores.apiKeys);
  const appMemberRepository = new JsonAppMemberRepository(stores.members);
  const systemSettingRepository = new JsonSystemSettingRepository(stores.settings);
  const auditLogRepository = new JsonAuditLogRepository(path.join(dataDir, "audit.jsonl"));
  const secretRepository = new JsonSecretRepository(stores.secrets, cascade);
  const secretValueRepository = new JsonSecretValueRepository(stores.secretValues);
  const requestCountRepository = new JsonRequestCountRepository(stores.requestCounts);

  // --- Caches ---
  const cache = new InMemoryToggleCache();
  const secretCache = new NoOpSecretCache();
  const requestCounter = new InMemoryRequestCounter();
  const rateLimitCache = { get: async () => null, set: async () => {}, invalidate: async () => {} };
  const rateLimitReader = createRateLimitConfigReader(rateLimitCache, systemSettingRepository);

  // --- Pool stub for adminRoutes ---
  const poolStub = {
    query: async (sql: string) => {
      if (sql === "SELECT 1") return { rows: [{}] };
      if (sql.includes("FROM users")) return { rows: [{ count: await userRepository.countAll() }] };
      if (sql.includes("FROM apps")) return { rows: [{ count: (await appRepository.findAll()).length }] };
      if (sql === "DELETE FROM apps") {
        const all = await appRepository.findAll();
        for (const a of all) await appRepository.delete(a.id.value);
        return { rows: [] };
      }
      if (sql.includes("DELETE FROM users")) {
        const all = await userRepository.findAll({ limit: 100000, offset: 0 });
        for (const u of all) { if (u.email !== "admin@semaforo.local") await userRepository.delete(u.id.value); }
        return { rows: [] };
      }
      if (sql === "DELETE FROM system_settings") { await stores.settings.clear(); return { rows: [] }; }
      if (sql === "DELETE FROM audit_log") { await auditLogRepository.clear(); return { rows: [] }; }
      throw new Error(`Unsupported SQL in standalone mode: ${sql}`);
    },
  };

  // --- Use cases ---
  const createAppUseCase = new CreateApp(appRepository);
  const listApps = new ListApps(appRepository);
  const getApp = new GetApp(appRepository);
  const getAppMetrics = new GetAppMetrics(appRepository, environmentRepository, toggleRepository, cache, requestCounter, requestCountRepository);
  const exportApp = new ExportApp(appRepository, environmentRepository, toggleRepository, toggleValueRepository, secretRepository, secretValueRepository);
  const importApp = new ImportApp(appRepository, environmentRepository, toggleRepository, toggleValueRepository, secretRepository, secretValueRepository);
  const getAppAuditLog = new GetAppAuditLog(appRepository, environmentRepository, toggleRepository, auditLogRepository, secretRepository);
  const exportAll = new ExportAll(appRepository, exportApp, userRepository, systemSettingRepository, appMemberRepository, apiKeyRepository, environmentRepository);
  const importAll = new ImportAll(importApp, userRepository, systemSettingRepository, appMemberRepository, apiKeyRepository, appRepository, environmentRepository);
  const backupDir = path.join(dataDir, "backups");
  const scheduledBackup = new ScheduledBackup(exportAll, systemSettingRepository, backupDir);
  const createEnvironment = new CreateEnvironment(appRepository, environmentRepository, apiKeyRepository);
  const listEnvironments = new ListEnvironments(environmentRepository);
  const updateEnvironmentUseCase = new UpdateEnvironment(environmentRepository, appRepository, cache);
  const createToggle = new CreateFeatureToggle(appRepository, toggleRepository);
  const listToggles = new ListToggles(toggleRepository);
  const setToggleValue = new SetToggleValue(toggleRepository, environmentRepository, toggleValueRepository, appRepository, cache);
  const getPublicToggles = new GetPublicToggles(appRepository, environmentRepository, toggleRepository, toggleValueRepository, cache);
  const getPublicValues = new GetPublicValues(appRepository, environmentRepository, toggleRepository, toggleValueRepository, cache);
  const login = new Login(userRepository, config.jwtSecret);
  const createApiKeyUseCase = new CreateApiKey(apiKeyRepository, environmentRepository);
  const listApiKeysUseCase = new ListApiKeys(apiKeyRepository);
  const deleteApiKeyUseCase = new DeleteApiKey(apiKeyRepository);
  const deleteFeatureToggle = new DeleteFeatureToggle(toggleRepository, appRepository, environmentRepository, cache);
  const encryptionService = createEncryptionService(config.encryptionKey);
  const deleteAppUseCase = new DeleteApp(appRepository, environmentRepository, cache, secretCache);
  const deleteEnvironmentUseCase = new DeleteEnvironment(environmentRepository, appRepository, cache, secretCache);
  const addAppMember = new AddAppMember(appMemberRepository);
  const removeAppMember = new RemoveAppMember(appMemberRepository);
  const listAppMembersUseCase = new ListAppMembers(appMemberRepository);
  const recordAudit = new RecordAuditEvent(auditLogRepository);
  const securityLogger = createSecurityLogger();

  // Admin use cases
  const adminCreateUser = new AdminCreateUser(userRepository);
  const adminListUsers = new AdminListUsers(userRepository);
  const adminUpdateUser = new AdminUpdateUser(userRepository);
  const adminDeleteUser = new AdminDeleteUser(userRepository);
  const adminResetPassword = new AdminResetUserPassword(userRepository);
  const adminListSettings = new AdminListSystemSettings(systemSettingRepository);
  const adminUpdateSetting = new AdminUpdateSystemSetting(systemSettingRepository);
  const adminListAuditLog = new AdminListAuditLog(auditLogRepository);

  // --- Express app ---
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: "*" }));
  app.use(express.json({ limit: "1mb" }));

  const auth = createAuthMiddleware(config.jwtSecret, securityLogger);
  const adminAuth = createAdminMiddleware(securityLogger);
  const apiKeyAuth = createApiKeyMiddleware(apiKeyRepository);

  // Public routes
  const getPublicSecretsUseCase = new GetPublicSecrets(appRepository, environmentRepository, secretRepository, secretValueRepository, encryptionService, secretCache);
  app.use("/api/public", createPublicLimiter(rateLimitReader), apiKeyAuth, publicRoutes(getPublicToggles, environmentRepository, appRepository, cache, requestCounter, rateLimitReader, getPublicSecretsUseCase, getPublicValues));

  // Auth
  app.use("/api/auth", createLoginLimiter(), authRoutes(login, config.jwtSecret, securityLogger));

  // Health
  app.get("/api/health", (_req, res) => { res.json({ status: "ok" }); });

  // Admin
  let onBackupSettingChanged: (() => Promise<void>) | null = null;
  app.use("/api/admin", auth, adminAuth, adminRoutes({
    createUser: adminCreateUser, listUsers: adminListUsers, updateUser: adminUpdateUser,
    deleteUser: adminDeleteUser, resetPassword: adminResetPassword,
    listSettings: adminListSettings, updateSetting: adminUpdateSetting,
    listAuditLog: adminListAuditLog, recordAudit,
    pool: poolStub as any,
    userRepository, appRepository, environmentRepository, toggleRepository, secretRepository,
    exportAll, importAll, scheduledBackup,
    onSettingChanged: async (key: string) => {
      if ((key === "backupSchedule" || key === "backupRetention") && onBackupSettingChanged) {
        await onBackupSettingChanged();
      }
    },
  }));

  // Protected routes
  app.use("/api/apps", auth, appRoutes(createAppUseCase, listApps, getApp, getAppMetrics, exportApp, importApp, recordAudit, getAppAuditLog, userRepository, deleteAppUseCase));
  app.use("/api/apps", auth, appMemberRoutes(addAppMember, removeAppMember, listAppMembersUseCase, userRepository, recordAudit));
  app.use("/api/environments", auth, apiKeyRoutes(createApiKeyUseCase, listApiKeysUseCase, deleteApiKeyUseCase, securityLogger));
  app.use("/api/api-keys", auth, apiKeyRoutes(createApiKeyUseCase, listApiKeysUseCase, deleteApiKeyUseCase, securityLogger));
  app.use("/api", auth, environmentRoutes(createEnvironment, listEnvironments, updateEnvironmentUseCase, appRepository, environmentRepository, cache, recordAudit, deleteEnvironmentUseCase));
  app.use("/api", auth, toggleRoutes(createToggle, setToggleValue, listToggles, getPublicToggles, recordAudit, toggleValueRepository, environmentRepository, deleteFeatureToggle));

  // Secrets
  const createSecretUseCase = new CreateSecret(appRepository, secretRepository);
  const listSecretsUseCase = new ListSecrets(secretRepository);
  const deleteSecretUseCase = new DeleteSecret(secretRepository, appRepository, environmentRepository, secretCache);
  const setSecretValueUseCase = new SetSecretValue(secretRepository, environmentRepository, secretValueRepository, appRepository, encryptionService, secretCache);
  const getSecretValueUseCase = new GetSecretValue(secretValueRepository, encryptionService);
  const revealSecretValueUseCase = new RevealSecretValue(secretValueRepository, encryptionService);
  app.use("/api", auth, secretRoutes(createSecretUseCase, listSecretsUseCase, deleteSecretUseCase, setSecretValueUseCase, getSecretValueUseCase, revealSecretValueUseCase, recordAudit));

  // --- Serve frontend ---
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const webDist = path.resolve(__dirname, "../../web/dist");
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(webDist, "index.html"));
    });
  }

  // --- Seed default user ---
  const seedDefaultUser = new SeedDefaultUser(userRepository);
  await seedDefaultUser.execute();

  // --- Flush request counts every 5 minutes ---
  const flushRequestCounts = new FlushRequestCounts(requestCountRepository, requestCounter);
  setInterval(() => { flushRequestCounts.execute().catch(console.error); }, 5 * 60 * 1000);

  // --- Backup scheduler ---
  let backupTimer: ReturnType<typeof setInterval> | null = null;
  async function startBackupScheduler() {
    if (backupTimer) clearInterval(backupTimer);
    backupTimer = null;
    const intervalMs = await scheduledBackup.getScheduleMs();
    if (!intervalMs) return;
    backupTimer = setInterval(() => {
      scheduledBackup.execute().then((info) => console.log(`Backup: ${info.filename}`)).catch(console.error);
    }, intervalMs);
  }
  onBackupSettingChanged = startBackupScheduler;
  await startBackupScheduler();

  // --- Start ---
  app.listen(port, () => {
    console.log(`\nSemaforo standalone running at http://localhost:${port}`);
    console.log(`Login: admin@semaforo.local / admin`);
    console.log(`Data: ${dataDir}\n`);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
