import type pg from "pg";
import type { ToggleValue, ToggleValueRepository } from "@semaforo/domain";

export class PgToggleValueRepository implements ToggleValueRepository {
  constructor(private pool: pg.Pool) {}

  async findByToggleAndEnvironment(
    toggleId: string,
    environmentId: string
  ): Promise<ToggleValue | null> {
    const result = await this.pool.query(
      "SELECT * FROM toggle_values WHERE toggle_id = $1 AND environment_id = $2",
      [toggleId, environmentId]
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }

  async findByEnvironmentId(environmentId: string): Promise<ToggleValue[]> {
    const result = await this.pool.query(
      "SELECT * FROM toggle_values WHERE environment_id = $1",
      [environmentId]
    );
    return result.rows.map(toDomain);
  }

  async save(value: ToggleValue): Promise<void> {
    await this.pool.query(
      `INSERT INTO toggle_values (id, toggle_id, environment_id, enabled, string_value, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET enabled = $4, string_value = $5, updated_at = $6`,
      [value.id.value, value.toggleId, value.environmentId, value.enabled, value.stringValue, value.updatedAt]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM toggle_values WHERE id = $1", [id]);
  }
}

function toDomain(row: Record<string, unknown>): ToggleValue {
  return {
    id: { value: row.id as string },
    toggleId: row.toggle_id as string,
    environmentId: row.environment_id as string,
    enabled: row.enabled as boolean,
    stringValue: (row.string_value as string) ?? "",
    updatedAt: new Date(row.updated_at as string),
  };
}
