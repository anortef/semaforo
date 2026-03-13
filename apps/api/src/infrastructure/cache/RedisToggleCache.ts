import Redis from "ioredis";

export interface ToggleCache {
  get(appKey: string, envKey: string): Promise<Record<string, boolean> | null>;
  set(
    appKey: string,
    envKey: string,
    toggles: Record<string, boolean>,
    ttlSeconds: number
  ): Promise<void>;
  invalidate(appKey: string, envKey: string): Promise<void>;
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
}

export class NoOpToggleCache implements ToggleCache {
  async get(): Promise<null> {
    return null;
  }
  async set(): Promise<void> {}
  async invalidate(): Promise<void> {}
}
