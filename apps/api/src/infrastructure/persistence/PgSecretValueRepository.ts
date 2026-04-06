import type pg from "pg";
import type { SecretValue, SecretValueRepository } from "@semaforo/domain";

export class PgSecretValueRepository implements SecretValueRepository {
  constructor(private pool: pg.Pool) {}

  async findBySecretAndEnvironment(
    secretId: string,
    environmentId: string
  ): Promise<SecretValue | null> {
    const result = await this.pool.query(
      "SELECT * FROM secret_values WHERE secret_id = $1 AND environment_id = $2",
      [secretId, environmentId]
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }

  async findByEnvironmentId(environmentId: string): Promise<SecretValue[]> {
    const result = await this.pool.query(
      "SELECT * FROM secret_values WHERE environment_id = $1",
      [environmentId]
    );
    return result.rows.map(toDomain);
  }

  async findBySecretId(secretId: string): Promise<SecretValue[]> {
    const result = await this.pool.query(
      "SELECT * FROM secret_values WHERE secret_id = $1",
      [secretId]
    );
    return result.rows.map(toDomain);
  }

  async save(value: SecretValue): Promise<void> {
    await this.pool.query(
      `INSERT INTO secret_values (id, secret_id, environment_id, encrypted_value, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET encrypted_value = $4, updated_at = $5`,
      [value.id.value, value.secretId, value.environmentId, value.encryptedValue, value.updatedAt]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM secret_values WHERE id = $1", [id]);
  }
}

function toDomain(row: Record<string, unknown>): SecretValue {
  return {
    id: { value: row.id as string },
    secretId: row.secret_id as string,
    environmentId: row.environment_id as string,
    encryptedValue: row.encrypted_value as string,
    updatedAt: new Date(row.updated_at as string),
  };
}
