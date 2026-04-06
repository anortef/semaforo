import rateLimit from "express-rate-limit";

const DEFAULT_PUBLIC_LIMIT = 100_000;
const DEFAULT_CACHE_MISS_LIMIT = 100;

export interface RateLimitConfigCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface RateLimitConfigDb {
  findByKey(key: string): Promise<{ value: string } | null>;
}

export interface RateLimitConfigReader {
  getPublicLimit(): Promise<number>;
  getCacheMissLimit(): Promise<number>;
}

export function createRateLimitConfigReader(
  cache: RateLimitConfigCache,
  db: RateLimitConfigDb
): RateLimitConfigReader {
  async function readLimit(redisKey: string, dbKey: string, fallback: number): Promise<number> {
    const cached = await cache.get(redisKey);
    if (cached) return parseInt(cached, 10);

    const setting = await db.findByKey(dbKey);
    if (setting) {
      await cache.set(redisKey, setting.value);
      return parseInt(setting.value, 10);
    }

    return fallback;
  }

  return {
    getPublicLimit: () => readLimit("ratelimit:public", "rateLimitPublic", DEFAULT_PUBLIC_LIMIT),
    getCacheMissLimit: () => readLimit("ratelimit:cacheMiss", "rateLimitCacheMiss", DEFAULT_CACHE_MISS_LIMIT),
  };
}

export function createLoginLimiter(maxAttempts = 10, windowMs = 15 * 60 * 1000) {
  return rateLimit({
    windowMs,
    max: maxAttempts,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });
}

export function createPublicLimiter(reader?: RateLimitConfigReader) {
  return rateLimit({
    windowMs: 60 * 1000,
    max: reader ? () => reader.getPublicLimit() : DEFAULT_PUBLIC_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });
}

export function createCacheMissLimiter(reader?: RateLimitConfigReader) {
  return rateLimit({
    windowMs: 60 * 1000,
    max: reader ? () => reader.getCacheMissLimit() : DEFAULT_CACHE_MISS_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });
}
