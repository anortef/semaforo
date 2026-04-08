import type { ToggleCache, CacheInfo } from "./RedisToggleCache.js";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  sizeBytes: number;
}

export class InMemoryToggleCache implements ToggleCache {
  private store = new Map<string, CacheEntry<Record<string, boolean | string>>>();
  private apiKeyStore = new Map<string, CacheEntry<Record<string, boolean | string>>>();

  private key(appKey: string, envKey: string): string {
    return `${appKey}:${envKey}`;
  }

  async get(appKey: string, envKey: string): Promise<Record<string, boolean | string> | null> {
    return this.getEntry(this.store, this.key(appKey, envKey));
  }

  async set(appKey: string, envKey: string, toggles: Record<string, boolean | string>, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    const json = JSON.stringify(toggles);
    this.store.set(this.key(appKey, envKey), {
      data: toggles,
      expiresAt: Date.now() + ttlSeconds * 1000,
      sizeBytes: Buffer.byteLength(json),
    });
  }

  async invalidate(appKey: string, envKey: string): Promise<void> {
    this.store.delete(this.key(appKey, envKey));
    this.apiKeyStore.clear();
  }

  async getByApiKey(apiKey: string): Promise<Record<string, boolean | string> | null> {
    return this.getEntry(this.apiKeyStore, apiKey);
  }

  async setByApiKey(apiKey: string, toggles: Record<string, boolean | string>, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    const json = JSON.stringify(toggles);
    this.apiKeyStore.set(apiKey, {
      data: toggles,
      expiresAt: Date.now() + ttlSeconds * 1000,
      sizeBytes: Buffer.byteLength(json),
    });
  }

  async getCacheInfo(appKey: string, envKey: string): Promise<CacheInfo | null> {
    const entry = this.store.get(this.key(appKey, envKey));
    if (!entry || Date.now() >= entry.expiresAt) return null;
    return {
      sizeBytes: entry.sizeBytes,
      remainingTtl: Math.max(0, Math.round((entry.expiresAt - Date.now()) / 1000)),
    };
  }

  private getEntry<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = map.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      map.delete(key);
      return null;
    }
    return entry.data;
  }
}
