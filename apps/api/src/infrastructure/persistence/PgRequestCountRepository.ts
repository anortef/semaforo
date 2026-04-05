import type pg from "pg";
import type { RequestCount, RequestCountRepository } from "@semaforo/domain";

export class PgRequestCountRepository implements RequestCountRepository {
  constructor(private pool: pg.Pool) {}

  async save(entry: RequestCount): Promise<void> {
    await this.pool.query(
      `INSERT INTO request_counts (id, environment_id, count, window_start, window_end)
       VALUES ($1, $2, $3, $4, $5)`,
      [entry.id.value, entry.environmentId, entry.count, entry.windowStart, entry.windowEnd]
    );
  }

  async sumByEnvironmentIdSince(environmentId: string, since: Date): Promise<number> {
    const result = await this.pool.query(
      `SELECT COALESCE(SUM(count), 0)::int AS total
       FROM request_counts
       WHERE environment_id = $1 AND window_end >= $2`,
      [environmentId, since]
    );
    return result.rows[0].total;
  }

  async sumByEnvironmentIds(environmentIds: string[], since: Date): Promise<Map<string, number>> {
    if (environmentIds.length === 0) return new Map();
    const result = await this.pool.query(
      `SELECT environment_id, COALESCE(SUM(count), 0)::int AS total
       FROM request_counts
       WHERE environment_id = ANY($1) AND window_end >= $2
       GROUP BY environment_id`,
      [environmentIds, since]
    );
    const map = new Map<string, number>();
    for (const row of result.rows) {
      map.set(row.environment_id as string, row.total as number);
    }
    return map;
  }
}
