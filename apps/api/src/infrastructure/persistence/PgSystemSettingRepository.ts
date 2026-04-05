import type pg from "pg";
import type { SystemSetting, SystemSettingRepository } from "@semaforo/domain";

export class PgSystemSettingRepository implements SystemSettingRepository {
  constructor(private pool: pg.Pool) {}

  async findByKey(key: string): Promise<SystemSetting | null> {
    const result = await this.pool.query(
      "SELECT * FROM system_settings WHERE key = $1",
      [key]
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }

  async findAll(): Promise<SystemSetting[]> {
    const result = await this.pool.query(
      "SELECT * FROM system_settings ORDER BY key"
    );
    return result.rows.map(toDomain);
  }

  async save(setting: SystemSetting): Promise<void> {
    await this.pool.query(
      `INSERT INTO system_settings (id, key, value, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE SET value = $3, updated_at = $4`,
      [setting.id.value, setting.key, setting.value, setting.updatedAt]
    );
  }
}

function toDomain(row: Record<string, unknown>): SystemSetting {
  return {
    id: { value: row.id as string },
    key: row.key as string,
    value: row.value as string,
    updatedAt: new Date(row.updated_at as string),
  };
}
