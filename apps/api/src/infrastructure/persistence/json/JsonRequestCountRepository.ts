import type { RequestCount, RequestCountRepository } from "@semaforo/domain";
import type { JsonFileStore } from "./JsonFileStore.js";

export class JsonRequestCountRepository implements RequestCountRepository {
  constructor(private store: JsonFileStore<RequestCount>) {}

  async save(entry: RequestCount): Promise<void> {
    await this.store.upsert(entry);
  }

  async sumByEnvironmentIdSince(environmentId: string, since: Date): Promise<number> {
    return this.store
      .filter((r) => r.environmentId === environmentId && new Date(r.windowEnd).getTime() >= since.getTime())
      .reduce((sum, r) => sum + r.count, 0);
  }

  async sumByEnvironmentIds(environmentIds: string[], since: Date): Promise<Map<string, number>> {
    const idSet = new Set(environmentIds);
    const result = new Map<string, number>();
    for (const id of environmentIds) result.set(id, 0);
    for (const r of this.store.filter((r) => idSet.has(r.environmentId) && new Date(r.windowEnd).getTime() >= since.getTime())) {
      result.set(r.environmentId, (result.get(r.environmentId) ?? 0) + r.count);
    }
    return result;
  }
}
