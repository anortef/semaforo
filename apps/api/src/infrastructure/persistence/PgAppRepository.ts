import type pg from "pg";
import type { App, AppRepository } from "@semaforo/domain";

export class PgAppRepository implements AppRepository {
  constructor(private pool: pg.Pool) {}

  async findById(id: string): Promise<App | null> {
    const result = await this.pool.query(
      "SELECT * FROM apps WHERE id = $1",
      [id]
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async findByKey(key: string): Promise<App | null> {
    const result = await this.pool.query(
      "SELECT * FROM apps WHERE key = $1",
      [key]
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async findAll(): Promise<App[]> {
    const result = await this.pool.query(
      "SELECT * FROM apps ORDER BY created_at DESC"
    );
    return result.rows.map(this.toDomain);
  }

  async save(app: App): Promise<void> {
    await this.pool.query(
      `INSERT INTO apps (id, name, key, description, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name = $2, description = $4`,
      [app.id.value, app.name, app.key, app.description, app.createdAt]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM apps WHERE id = $1", [id]);
  }

  private toDomain(row: Record<string, unknown>): App {
    return {
      id: { value: row.id as string },
      name: row.name as string,
      key: row.key as string,
      description: row.description as string,
      createdAt: new Date(row.created_at as string),
    };
  }
}
