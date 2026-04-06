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
const app = createExpressApp(pool, config, cache, requestCounter, rateLimitReader, async (key: string) => {
  const keyMap: Record<string, string> = {
    rateLimitPublic: "ratelimit:public",
    rateLimitCacheMiss: "ratelimit:cacheMiss",
  };
  const redisKey = keyMap[key];
  if (redisKey) await rateLimitCache.invalidate(redisKey);
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

app.listen(config.port, () => {
  console.log(`Semaforo API running on port ${config.port}`);
});
