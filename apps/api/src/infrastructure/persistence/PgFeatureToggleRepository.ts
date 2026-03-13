import type pg from "pg";
import type { FeatureToggle, FeatureToggleRepository } from "@semaforo/domain";

export class PgFeatureToggleRepository implements FeatureToggleRepository {
  constructor(private pool: pg.Pool) {}

  async findById(id: string): Promise<FeatureToggle | null> {
    const result = await this.pool.query(
      "SELECT * FROM feature_toggles WHERE id = $1",
      [id]
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async findByAppId(appId: string): Promise<FeatureToggle[]> {
    const result = await this.pool.query(
      "SELECT * FROM feature_toggles WHERE app_id = $1 ORDER BY created_at",
      [appId]
    );
    return result.rows.map(this.toDomain);
  }

  async findByAppIdAndKey(
    appId: string,
    key: string
  ): Promise<FeatureToggle | null> {
    const result = await this.pool.query(
      "SELECT * FROM feature_toggles WHERE app_id = $1 AND key = $2",
      [appId, key]
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async save(toggle: FeatureToggle): Promise<void> {
    await this.pool.query(
      `INSERT INTO feature_toggles (id, app_id, name, key, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET name = $3, description = $5`,
      [
        toggle.id.value,
        toggle.appId,
        toggle.name,
        toggle.key,
        toggle.description,
        toggle.createdAt,
      ]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM feature_toggles WHERE id = $1", [id]);
  }

  private toDomain(row: Record<string, unknown>): FeatureToggle {
    return {
      id: { value: row.id as string },
      appId: row.app_id as string,
      name: row.name as string,
      key: row.key as string,
      description: row.description as string,
      createdAt: new Date(row.created_at as string),
    };
  }
}
