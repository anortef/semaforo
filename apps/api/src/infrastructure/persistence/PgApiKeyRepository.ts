import type pg from "pg";
import type { ApiKey, ApiKeyRepository } from "@semaforo/domain";

export class PgApiKeyRepository implements ApiKeyRepository {
  constructor(private pool: pg.Pool) {}

  async findById(id: string): Promise<ApiKey | null> {
    const result = await this.pool.query(
      "SELECT * FROM api_keys WHERE id = $1",
      [id]
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }

  async findByKey(key: string): Promise<ApiKey | null> {
    const result = await this.pool.query(
      "SELECT * FROM api_keys WHERE key = $1",
      [key]
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }

  async findByAppId(appId: string): Promise<ApiKey[]> {
    const result = await this.pool.query(
      "SELECT * FROM api_keys WHERE app_id = $1 ORDER BY created_at DESC",
      [appId]
    );
    return result.rows.map(toDomain);
  }

  async save(apiKey: ApiKey): Promise<void> {
    await this.pool.query(
      `INSERT INTO api_keys (id, app_id, name, key, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name = $3`,
      [apiKey.id.value, apiKey.appId, apiKey.name, apiKey.key, apiKey.createdAt]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM api_keys WHERE id = $1", [id]);
  }
}

function toDomain(row: Record<string, unknown>): ApiKey {
  return {
    id: { value: row.id as string },
    appId: row.app_id as string,
    name: row.name as string,
    key: row.key as string,
    createdAt: new Date(row.created_at as string),
  };
}
