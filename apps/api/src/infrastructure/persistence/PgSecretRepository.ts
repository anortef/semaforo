import type pg from "pg";
import type { Secret, SecretRepository } from "@semaforo/domain";

export class PgSecretRepository implements SecretRepository {
  constructor(private pool: pg.Pool) {}

  async findById(id: string): Promise<Secret | null> {
    const result = await this.pool.query(
      "SELECT * FROM secrets WHERE id = $1",
      [id]
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }

  async findByAppId(appId: string): Promise<Secret[]> {
    const result = await this.pool.query(
      "SELECT * FROM secrets WHERE app_id = $1 ORDER BY created_at",
      [appId]
    );
    return result.rows.map(toDomain);
  }

  async findByAppIdAndKey(
    appId: string,
    key: string
  ): Promise<Secret | null> {
    const result = await this.pool.query(
      "SELECT * FROM secrets WHERE app_id = $1 AND key = $2",
      [appId, key]
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }

  async save(secret: Secret): Promise<void> {
    await this.pool.query(
      `INSERT INTO secrets (id, app_id, key, description, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET description = $4`,
      [secret.id.value, secret.appId, secret.key, secret.description, secret.createdAt]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM secrets WHERE id = $1", [id]);
  }
}

function toDomain(row: Record<string, unknown>): Secret {
  return {
    id: { value: row.id as string },
    appId: row.app_id as string,
    key: row.key as string,
    description: row.description as string,
    createdAt: new Date(row.created_at as string),
  };
}
