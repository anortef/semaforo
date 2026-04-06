import type Redis from "ioredis";

export interface SecretCache {
  get(appKey: string, envKey: string): Promise<Record<string, string> | null>;
  set(
    appKey: string,
    envKey: string,
    secrets: Record<string, string>,
    ttlSeconds: number
  ): Promise<void>;
  invalidate(appKey: string, envKey: string): Promise<void>;
}

export class RedisSecretCache implements SecretCache {
  constructor(private redis: Redis) {}

  private cacheKey(appKey: string, envKey: string): string {
    return `secrets:${appKey}:${envKey}`;
  }

  async get(
    appKey: string,
    envKey: string
  ): Promise<Record<string, string> | null> {
    const data = await this.redis.get(this.cacheKey(appKey, envKey));
    if (!data) return null;
    return JSON.parse(data);
  }

  async set(
    appKey: string,
    envKey: string,
    secrets: Record<string, string>,
    ttlSeconds: number
  ): Promise<void> {
    if (ttlSeconds <= 0) return;
    await this.redis.set(
      this.cacheKey(appKey, envKey),
      JSON.stringify(secrets),
      "EX",
      ttlSeconds
    );
  }

  async invalidate(appKey: string, envKey: string): Promise<void> {
    await this.redis.del(this.cacheKey(appKey, envKey));
  }
}

export class NoOpSecretCache implements SecretCache {
  async get(): Promise<null> {
    return null;
  }
  async set(): Promise<void> {}
  async invalidate(): Promise<void> {}
}
