import { v4 as uuid } from "uuid";
import { createRequestCount, type RequestCountRepository } from "@semaforo/domain";
import type { RequestCounter } from "../infrastructure/cache/RedisToggleCache.js";

export class FlushRequestCounts {
  constructor(
    private repository: RequestCountRepository,
    private counter: RequestCounter
  ) {}

  async execute(): Promise<void> {
    const envIds = await this.counter.getAllEnvironmentIds();
    const now = new Date();
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000);

    for (const envId of envIds) {
      const count = await this.counter.getAndReset(envId);
      if (count <= 0) continue;

      const entry = createRequestCount({
        id: uuid(),
        environmentId: envId,
        count,
        windowStart,
        windowEnd: now,
      });
      await this.repository.save(entry);
    }
  }
}
