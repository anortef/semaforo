import type pg from "pg";
import type { Environment, EnvironmentRepository } from "@semaforo/domain";

export class PgEnvironmentRepository implements EnvironmentRepository {
  constructor(private pool: pg.Pool) {}

  async findById(id: string): Promise<Environment | null> {
    const result = await this.pool.query(
      "SELECT * FROM environments WHERE id = $1",
      [id]
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async findByAppId(appId: string): Promise<Environment[]> {
    const result = await this.pool.query(
      "SELECT * FROM environments WHERE app_id = $1 ORDER BY created_at",
      [appId]
    );
    return result.rows.map(this.toDomain);
  }

  async findByAppIdAndKey(
    appId: string,
    key: string
  ): Promise<Environment | null> {
    const result = await this.pool.query(
      "SELECT * FROM environments WHERE app_id = $1 AND key = $2",
      [appId, key]
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async save(environment: Environment): Promise<void> {
    await this.pool.query(
      `INSERT INTO environments (id, app_id, name, key, cache_ttl_seconds, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET name = $3, cache_ttl_seconds = $5`,
      [
        environment.id.value,
        environment.appId,
        environment.name,
        environment.key,
        environment.cacheTtlSeconds,
        environment.createdAt,
      ]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM environments WHERE id = $1", [id]);
  }

  private toDomain(row: Record<string, unknown>): Environment {
    return {
      id: { value: row.id as string },
      appId: row.app_id as string,
      name: row.name as string,
      key: row.key as string,
      cacheTtlSeconds: (row.cache_ttl_seconds as number) ?? 300,
      createdAt: new Date(row.created_at as string),
    };
  }
}
