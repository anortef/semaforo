import type { RequestCount } from "../entities/RequestCount.js";

export interface RequestCountRepository {
  save(entry: RequestCount): Promise<void>;
  sumByEnvironmentIdSince(environmentId: string, since: Date): Promise<number>;
  sumByEnvironmentIds(environmentIds: string[], since: Date): Promise<Map<string, number>>;
}
