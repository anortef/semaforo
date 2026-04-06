import Redis from "ioredis";
import { loadConfig } from "./infrastructure/config/env.js";
import { createPool } from "./infrastructure/persistence/database.js";
import { RedisToggleCache, RedisRequestCounter, RedisRateLimitConfigCache } from "./infrastructure/cache/RedisToggleCache.js";
import { RedisSecretCache } from "./infrastructure/cache/SecretCache.js";
import { createExpressApp } from "./infrastructure/http/app.js";
import { PgUserRepository } from "./infrastructure/persistence/PgUserRepository.js";
import { PgRequestCountRepository } from "./infrastructure/persistence/PgRequestCountRepository.js";
import { SeedDefaultUser } from "./application/SeedDefaultUser.js";
import { FlushRequestCounts } from "./application/FlushRequestCounts.js";
import { PgSystemSettingRepository } from "./infrastructure/persistence/PgSystemSettingRepository.js";
import { ScheduledBackup } from "./application/ScheduledBackup.js";
import { ExportApp } from "./application/ExportApp.js";
import { ExportAll } from "./application/ExportAll.js";
import { PgAppRepository } from "./infrastructure/persistence/PgAppRepository.js";
import { PgEnvironmentRepository } from "./infrastructure/persistence/PgEnvironmentRepository.js";
import { PgFeatureToggleRepository } from "./infrastructure/persistence/PgFeatureToggleRepository.js";
import { PgToggleValueRepository } from "./infrastructure/persistence/PgToggleValueRepository.js";
import { PgSecretRepository } from "./infrastructure/persistence/PgSecretRepository.js";
import { PgSecretValueRepository } from "./infrastructure/persistence/PgSecretValueRepository.js";
import { PgApiKeyRepository } from "./infrastructure/persistence/PgApiKeyRepository.js";
import { PgAppMemberRepository } from "./infrastructure/persistence/PgAppMemberRepository.js";
import { createRateLimitConfigReader } from "./infrastructure/http/middleware/rateLimiter.js";

const config = loadConfig();
const pool = createPool(config.database);
const redis = new Redis({ host: config.redis.host, port: config.redis.port });
const cache = new RedisToggleCache(redis);
const secretCache = new RedisSecretCache(redis);
const requestCounter = new RedisRequestCounter(redis);
const rateLimitCache = new RedisRateLimitConfigCache(redis);
const settingRepo = new PgSystemSettingRepository(pool);
const rateLimitReader = createRateLimitConfigReader(rateLimitCache, settingRepo);
let onBackupSettingChanged: (() => Promise<void>) | null = null;

const app = createExpressApp(pool, config, cache, requestCounter, rateLimitReader, async (key: string) => {
  const keyMap: Record<string, string> = {
    rateLimitPublic: "ratelimit:public",
    rateLimitCacheMiss: "ratelimit:cacheMiss",
  };
  const redisKey = keyMap[key];
  if (redisKey) await rateLimitCache.invalidate(redisKey);
  if ((key === "backupSchedule" || key === "backupRetention") && onBackupSettingChanged) {
    await onBackupSettingChanged();
  }
}, secretCache);

const userRepository = new PgUserRepository(pool);
const seedDefaultUser = new SeedDefaultUser(userRepository);

seedDefaultUser.execute().then(() => {
  console.log("Default user seed complete.");
}).catch((err) => {
  console.error("Failed to seed default user:", err);
});

// Flush request counters from Redis to Postgres every 5 minutes
const requestCountRepo = new PgRequestCountRepository(pool);
const flushRequestCounts = new FlushRequestCounts(requestCountRepo, requestCounter);
const FLUSH_INTERVAL = 5 * 60 * 1000;

setInterval(() => {
  flushRequestCounts.execute().catch((err) => {
    console.error("Failed to flush request counts:", err);
  });
}, FLUSH_INTERVAL);

// Scheduled backups
const appRepo = new PgAppRepository(pool);
const envRepo = new PgEnvironmentRepository(pool);
const toggleRepo = new PgFeatureToggleRepository(pool);
const valueRepo = new PgToggleValueRepository(pool);
const secretRepo = new PgSecretRepository(pool);
const secretValueRepo = new PgSecretValueRepository(pool);
const apiKeyRepo = new PgApiKeyRepository(pool);
const memberRepo = new PgAppMemberRepository(pool);
const exportApp = new ExportApp(appRepo, envRepo, toggleRepo, valueRepo, secretRepo, secretValueRepo);
const exportAll = new ExportAll(appRepo, exportApp, userRepository, settingRepo, memberRepo, apiKeyRepo, envRepo);
const backupDir = process.env.BACKUP_DIR ?? "/app/backups";
const scheduledBackup = new ScheduledBackup(exportAll, settingRepo, backupDir);

let backupTimer: ReturnType<typeof setInterval> | null = null;

async function startBackupScheduler() {
  if (backupTimer) clearInterval(backupTimer);
  backupTimer = null;

  const intervalMs = await scheduledBackup.getScheduleMs();
  if (!intervalMs) {
    console.log("Backup scheduler: disabled (no schedule configured)");
    return;
  }

  console.log(`Backup scheduler: running every ${intervalMs / 1000 / 60} minutes`);
  backupTimer = setInterval(() => {
    scheduledBackup.execute().then((info) => {
      console.log(`Backup created: ${info.filename} (${info.size} bytes)`);
    }).catch((err) => {
      console.error("Scheduled backup failed:", err);
    });
  }, intervalMs);
}

onBackupSettingChanged = startBackupScheduler;
startBackupScheduler();

app.listen(config.port, () => {
  console.log(`Semaforo API running on port ${config.port}`);
});
