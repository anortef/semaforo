import type { RequestCounter } from "./RedisToggleCache.js";

export class InMemoryRequestCounter implements RequestCounter {
  private counts = new Map<string, number>();

  async increment(environmentId: string): Promise<void> {
    this.counts.set(environmentId, (this.counts.get(environmentId) ?? 0) + 1);
  }

  async getAndReset(environmentId: string): Promise<number> {
    const val = this.counts.get(environmentId) ?? 0;
    this.counts.set(environmentId, 0);
    return val;
  }

  async getAllEnvironmentIds(): Promise<string[]> {
    return [...this.counts.entries()]
      .filter(([, count]) => count > 0)
      .map(([id]) => id);
  }

  async getCurrentCount(environmentId: string): Promise<number> {
    return this.counts.get(environmentId) ?? 0;
  }
}
