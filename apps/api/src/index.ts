import Redis from "ioredis";
import { loadConfig } from "./infrastructure/config/env.js";
import { createPool } from "./infrastructure/persistence/database.js";
import { RedisToggleCache } from "./infrastructure/cache/RedisToggleCache.js";
import { createExpressApp } from "./infrastructure/http/app.js";

const config = loadConfig();
const pool = createPool(config.database);
const redis = new Redis({ host: config.redis.host, port: config.redis.port });
const cache = new RedisToggleCache(redis);
const app = createExpressApp(pool, config, cache);

app.listen(config.port, () => {
  console.log(`Semaforo API running on port ${config.port}`);
});
