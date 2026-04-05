import Redis from "ioredis";

export interface CacheInfo {
  sizeBytes: number;
  remainingTtl: number;
}

export interface ToggleCache {
  get(appKey: string, envKey: string): Promise<Record<string, boolean> | null>;
  set(
    appKey: string,
    envKey: string,
    toggles: Record<string, boolean>,
    ttlSeconds: number
  ): Promise<void>;
  invalidate(appKey: string, envKey: string): Promise<void>;
  getByApiKey(apiKey: string): Promise<Record<string, boolean> | null>;
  setByApiKey(
    apiKey: string,
    toggles: Record<string, boolean>,
    ttlSeconds: number
  ): Promise<void>;
  getCacheInfo(appKey: string, envKey: string): Promise<CacheInfo | null>;
}

export class RedisToggleCache implements ToggleCache {
  constructor(private redis: Redis) {}

  private cacheKey(appKey: string, envKey: string): string {
    return `toggles:${appKey}:${envKey}`;
  }

  async get(
    appKey: string,
    envKey: string
  ): Promise<Record<string, boolean> | null> {
    const data = await this.redis.get(this.cacheKey(appKey, envKey));
    if (!data) return null;
    return JSON.parse(data);
  }

  async set(
    appKey: string,
    envKey: string,
    toggles: Record<string, boolean>,
    ttlSeconds: number
  ): Promise<void> {
    if (ttlSeconds <= 0) return;
    await this.redis.set(
      this.cacheKey(appKey, envKey),
      JSON.stringify(toggles),
      "EX",
      ttlSeconds
    );
  }

  async invalidate(appKey: string, envKey: string): Promise<void> {
    await this.redis.del(this.cacheKey(appKey, envKey));
  }

  async getByApiKey(apiKey: string): Promise<Record<string, boolean> | null> {
    const data = await this.redis.get(`toggles:apikey:${apiKey}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  async setByApiKey(
    apiKey: string,
    toggles: Record<string, boolean>,
    ttlSeconds: number
  ): Promise<void> {
    if (ttlSeconds <= 0) return;
    await this.redis.set(
      `toggles:apikey:${apiKey}`,
      JSON.stringify(toggles),
      "EX",
      ttlSeconds
    );
  }

  async getCacheInfo(appKey: string, envKey: string): Promise<CacheInfo | null> {
    const key = this.cacheKey(appKey, envKey);
    const data = await this.redis.get(key);
    if (!data) return null;
    const ttl = await this.redis.ttl(key);
    return { sizeBytes: Buffer.byteLength(data), remainingTtl: Math.max(ttl, 0) };
  }
}

export interface RequestCounter {
  increment(environmentId: string): Promise<void>;
  getAndReset(environmentId: string): Promise<number>;
  getAllEnvironmentIds(): Promise<string[]>;
  getCurrentCount(environmentId: string): Promise<number>;
}

export class RedisRequestCounter implements RequestCounter {
  constructor(private redis: Redis) {}

  async increment(environmentId: string): Promise<void> {
    await this.redis.incr(`requests:${environmentId}`);
  }

  async getAndReset(environmentId: string): Promise<number> {
    const val = await this.redis.getset(`requests:${environmentId}`, "0");
    return parseInt(val ?? "0", 10);
  }

  async getAllEnvironmentIds(): Promise<string[]> {
    const keys = await this.redis.keys("requests:*");
    return keys.map((k) => k.replace("requests:", ""));
  }

  async getCurrentCount(environmentId: string): Promise<number> {
    const val = await this.redis.get(`requests:${environmentId}`);
    return parseInt(val ?? "0", 10);
  }
}

export class NoOpRequestCounter implements RequestCounter {
  async increment(): Promise<void> {}
  async getAndReset(): Promise<number> { return 0; }
  async getAllEnvironmentIds(): Promise<string[]> { return []; }
  async getCurrentCount(): Promise<number> { return 0; }
}

export class NoOpToggleCache implements ToggleCache {
  async get(): Promise<null> {
    return null;
  }
  async set(): Promise<void> {}
  async invalidate(): Promise<void> {}
  async getByApiKey(): Promise<null> {
    return null;
  }
  async setByApiKey(): Promise<void> {}
  async getCacheInfo(): Promise<null> {
    return null;
  }
}
