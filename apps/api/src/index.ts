import Redis from "ioredis";
import { loadConfig } from "./infrastructure/config/env.js";
import { createPool } from "./infrastructure/persistence/database.js";
import { RedisToggleCache } from "./infrastructure/cache/RedisToggleCache.js";
import { createExpressApp } from "./infrastructure/http/app.js";
import { PgUserRepository } from "./infrastructure/persistence/PgUserRepository.js";
import { SeedDefaultUser } from "./application/SeedDefaultUser.js";

const config = loadConfig();
const pool = createPool(config.database);
const redis = new Redis({ host: config.redis.host, port: config.redis.port });
const cache = new RedisToggleCache(redis);
const app = createExpressApp(pool, config, cache);

const userRepository = new PgUserRepository(pool);
const seedDefaultUser = new SeedDefaultUser(userRepository);

seedDefaultUser.execute().then(() => {
  console.log("Default user seed complete.");
}).catch((err) => {
  console.error("Failed to seed default user:", err);
});

app.listen(config.port, () => {
  console.log(`Semaforo API running on port ${config.port}`);
});
